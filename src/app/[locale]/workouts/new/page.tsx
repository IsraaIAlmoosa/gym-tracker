import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutBuilder, { type SessionExercise } from '@/components/WorkoutBuilder';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { resolveProgramDayName } from '@/lib/programs';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ program?: string }>;
};

type RoutineExerciseRow = {
  exercise_id: string;
  order_index: number;
};

type RoutineRow = {
  id: string;
  name: string;
  routine_exercises: RoutineExerciseRow[];
};

type LastSetRow = {
  exercise_id: string;
  weight: number;
  reps: number;
  created_at: string;
};

type ExerciseFull = {
  id: string;
  name_ar: string;
  name_en: string;
  muscle_group_ar: string | null;
  muscle_group_en: string | null;
  equipment_ar: string | null;
  equipment_en: string | null;
  affects_areas: string[] | null;
  impact_level: number | null;
};

type ProgramExerciseWithDetails = {
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  exercises: ExerciseFull | ExerciseFull[] | null;
};

type ProgramSummary = { is_default: boolean; days_per_week: number; duration_weeks: number };

type EnrollmentWithProgram = {
  id: string;
  program_id: string;
  current_week: number;
  current_day_index: number;
  programs: ProgramSummary | ProgramSummary[] | null;
};

function resolveOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function NewWorkoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { program: programEnrollmentIdParam } = await searchParams;
  const isArabic = locale === 'ar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('avoided_areas, gender, age, preferred_weight_unit')
    .eq('id', user.id)
    .maybeSingle();

  const avoidedAreas: string[] = profile?.avoided_areas ?? [];
  const gender = (profile?.gender ?? null) as 'male' | 'female' | null;
  const age = (profile?.age ?? null) as number | null;
  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;

  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select(
      'id, name_ar, name_en, muscle_group_ar, muscle_group_en, equipment_ar, equipment_en, affects_areas, impact_level'
    )
    .order(isArabic ? 'name_ar' : 'name_en');

  const { data: routinesRaw, error: routinesError } = await supabase
    .from('routines')
    .select('id, name, routine_exercises(exercise_id, order_index)')
    .order('created_at', { ascending: false })
    .order('order_index', { referencedTable: 'routine_exercises', ascending: true });

  const { data: lastSetsRaw, error: lastSetsError } = await supabase
    .from('workout_sets')
    .select('exercise_id, weight, reps, created_at')
    .order('created_at', { ascending: false });

  if (profileError || exercisesError || routinesError || lastSetsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const allExercises = exercises ?? [];

  const availableExercises = allExercises.filter((ex) => {
    const areas: string[] = ex.affects_areas ?? [];
    return !areas.some((a) => avoidedAreas.includes(a));
  });

  const hiddenCount = allExercises.length - availableExercises.length;

  const routines = ((routinesRaw ?? []) as unknown as RoutineRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    exerciseIds: r.routine_exercises.map((re) => re.exercise_id),
  }));

  const lastSetByExercise: Record<string, { weight: number; reps: number }> = {};
  const personalRecordByExercise: Record<string, { weight: number; reps: number }> = {};
  for (const row of (lastSetsRaw ?? []) as unknown as LastSetRow[]) {
    if (!lastSetByExercise[row.exercise_id]) {
      lastSetByExercise[row.exercise_id] = { weight: row.weight, reps: row.reps };
    }
    const record = personalRecordByExercise[row.exercise_id];
    if (!record || row.weight > record.weight || (row.weight === record.weight && row.reps > record.reps)) {
      personalRecordByExercise[row.exercise_id] = { weight: row.weight, reps: row.reps };
    }
  }

  let programEnrollmentId: string | undefined;
  let programDayId: string | undefined;
  let programDayName: string | undefined;
  let programWeekInfo: { current: number; total: number } | undefined;
  let programTargets: Record<string, { sets: number | null; reps: string | null }> | undefined;
  let initialSessionExercises: SessionExercise[] | undefined;

  if (programEnrollmentIdParam) {
    const { data: enrollmentRaw } = await supabase
      .from('program_enrollments')
      .select('id, program_id, current_week, current_day_index, programs(is_default, days_per_week, duration_weeks)')
      .eq('id', programEnrollmentIdParam)
      .eq('status', 'active')
      .maybeSingle();

    const enrollment = enrollmentRaw as unknown as EnrollmentWithProgram | null;
    const program = enrollment ? resolveOne(enrollment.programs) : null;

    if (enrollment && program) {
      const { data: dayRaw } = await supabase
        .from('program_days')
        .select(
          'id, name, name_ar, name_en, program_exercises(exercise_id, order_index, target_sets, target_reps, exercises(id, name_ar, name_en, muscle_group_ar, muscle_group_en, equipment_ar, equipment_en, affects_areas, impact_level))'
        )
        .eq('program_id', enrollment.program_id)
        .eq('day_index', enrollment.current_day_index)
        .maybeSingle();

      if (dayRaw) {
        const dayExercises = ((dayRaw.program_exercises ?? []) as unknown as ProgramExerciseWithDetails[])
          .slice()
          .sort((a, b) => a.order_index - b.order_index);

        programEnrollmentId = enrollment.id;
        programDayId = dayRaw.id;
        programDayName = resolveProgramDayName(
          { name: dayRaw.name, nameAr: dayRaw.name_ar, nameEn: dayRaw.name_en },
          isArabic,
          program.is_default
        );
        programWeekInfo = { current: enrollment.current_week, total: program.duration_weeks };

        programTargets = {};
        initialSessionExercises = [];

        for (const pe of dayExercises) {
          const ex = resolveOne(pe.exercises);
          if (!ex) continue;
          programTargets[ex.id] = { sets: pe.target_sets, reps: pe.target_reps };
          const last = lastSetByExercise[ex.id];
          initialSessionExercises.push({
            exercise: ex,
            sets: [],
            draftWeight: last ? String(kgToDisplayUnit(last.weight, weightUnit)) : '',
            draftReps: last ? String(last.reps) : '',
          });
        }
      }
    }
  }

  return (
    <WorkoutBuilder
      locale={locale}
      exercises={availableExercises}
      hiddenCount={hiddenCount}
      gender={gender}
      age={age}
      weightUnit={weightUnit}
      routines={routines}
      lastSetByExercise={lastSetByExercise}
      personalRecordByExercise={personalRecordByExercise}
      initialSessionExercises={initialSessionExercises}
      programEnrollmentId={programEnrollmentId}
      programDayId={programDayId}
      programDayName={programDayName}
      programWeekInfo={programWeekInfo}
      programTargets={programTargets}
    />
  );
}
