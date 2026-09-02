import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutBuilder, { type SessionExercise } from '@/components/WorkoutBuilder';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string; id: string }>;
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

type ExerciseColumns = {
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

type SessionSetRow = {
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  exercises: ExerciseColumns | ExerciseColumns[] | null;
};

export default async function EditWorkoutPage({ params }: Props) {
  const { locale, id } = await params;
  const isArabic = locale === 'ar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('id, duration')
    .eq('id', id)
    .maybeSingle();

  if (sessionError) {
    return <LoadErrorNotice locale={locale} />;
  }

  if (!session) {
    redirect(`/${locale}/history`);
  }

  const { data: setsRaw, error: setsError } = await supabase
    .from('workout_sets')
    .select(
      'exercise_id, set_number, weight, reps, exercises(id, name_ar, name_en, muscle_group_ar, muscle_group_en, equipment_ar, equipment_en, affects_areas, impact_level)'
    )
    .eq('session_id', id)
    .order('set_number', { ascending: true });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('avoided_areas, gender, age, preferred_weight_unit')
    .eq('id', user.id)
    .maybeSingle();

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

  if (
    setsError ||
    profileError ||
    exercisesError ||
    routinesError ||
    lastSetsError
  ) {
    return <LoadErrorNotice locale={locale} />;
  }

  const avoidedAreas: string[] = profile?.avoided_areas ?? [];
  const gender = (profile?.gender ?? null) as 'male' | 'female' | null;
  const age = (profile?.age ?? null) as number | null;
  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;

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
  for (const row of (lastSetsRaw ?? []) as unknown as LastSetRow[]) {
    if (!lastSetByExercise[row.exercise_id]) {
      lastSetByExercise[row.exercise_id] = { weight: row.weight, reps: row.reps };
    }
  }

  const initialSessionExercises: SessionExercise[] = [];
  const indexByExerciseId = new Map<string, number>();
  for (const row of (setsRaw ?? []) as unknown as SessionSetRow[]) {
    const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    if (!exercise) continue;

    let index = indexByExerciseId.get(row.exercise_id);
    if (index === undefined) {
      index = initialSessionExercises.length;
      indexByExerciseId.set(row.exercise_id, index);
      initialSessionExercises.push({ exercise, sets: [], draftWeight: '', draftReps: '' });
    }
    initialSessionExercises[index].sets.push({
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
    });
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
      editingSessionId={session.id}
      initialSessionExercises={initialSessionExercises}
      initialDurationMinutes={session.duration ?? 1}
    />
  );
}
