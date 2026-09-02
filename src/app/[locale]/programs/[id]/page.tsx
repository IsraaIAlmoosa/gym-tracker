import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import ProgramDetailManager, {
  type ProgramDayDetail,
  type ExerciseOption,
} from '@/components/ProgramDetailManager';
import {
  mapProgramRow,
  resolveProgramName,
  resolveProgramDescription,
  resolveProgramDayName,
  type ProgramRow,
} from '@/lib/programs';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type ExerciseNameRow = { name_ar: string; name_en: string };

type ProgramExerciseRow = {
  id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

type ProgramDayRow = {
  id: string;
  day_index: number;
  name: string;
  name_ar: string | null;
  name_en: string | null;
  program_exercises: ProgramExerciseRow[];
};

type EnrollmentRow = { id: string; program_id: string };

function resolveOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ProgramDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'programs' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [
    { data: programRaw, error: programError },
    { data: daysRaw, error: daysError },
    { data: allExercisesRaw, error: exercisesError },
    { data: enrollmentRows, error: enrollmentError },
  ] = await Promise.all([
    supabase
      .from('programs')
      .select(
        'id, is_default, created_by_user_id, slug, category, name, name_ar, name_en, description, description_ar, description_en, duration_weeks, days_per_week'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('program_days')
      .select(
        'id, day_index, name, name_ar, name_en, program_exercises(id, exercise_id, order_index, target_sets, target_reps, exercises(name_ar, name_en))'
      )
      .eq('program_id', id)
      .order('day_index', { ascending: true })
      .order('order_index', { referencedTable: 'program_exercises', ascending: true }),
    supabase.from('exercises').select('id, name_ar, name_en').order(isArabic ? 'name_ar' : 'name_en'),
    supabase
      .from('program_enrollments')
      .select('id, program_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (programError || daysError || exercisesError || enrollmentError) {
    return <LoadErrorNotice locale={locale} />;
  }

  if (!programRaw) {
    redirect(`/${locale}/programs`);
  }

  const program = mapProgramRow(programRaw as ProgramRow);

  const days: ProgramDayDetail[] = ((daysRaw ?? []) as unknown as ProgramDayRow[]).map((d) => ({
    id: d.id,
    dayIndex: d.day_index,
    name: resolveProgramDayName(
      { name: d.name, nameAr: d.name_ar, nameEn: d.name_en },
      isArabic,
      program.isDefault
    ),
    exercises: d.program_exercises.map((pe) => {
      const ex = resolveOne(pe.exercises);
      return {
        id: pe.id,
        exerciseId: pe.exercise_id,
        name: ex ? (isArabic ? ex.name_ar : ex.name_en) : '',
        targetSets: pe.target_sets,
        targetReps: pe.target_reps,
      };
    }),
  }));

  const allExercises: ExerciseOption[] = allExercisesRaw ?? [];

  const activeEnrollment = ((enrollmentRows ?? []) as unknown as EnrollmentRow[])[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <a href={`/${locale}/programs`} className="text-sm text-text-muted no-underline">
        {t('back')}
      </a>

      <h1 className="m-0 mt-2 mb-1 text-2xl font-bold text-text lg:text-3xl">
        {resolveProgramName(program, isArabic)}
      </h1>
      <p className="m-0 mb-1 text-sm text-text-muted">
        {t('weeksXDays', { weeks: program.durationWeeks, days: program.daysPerWeek })}
      </p>
      {resolveProgramDescription(program, isArabic) && (
        <p className="m-0 mb-6 text-sm leading-relaxed text-text-muted">
          {resolveProgramDescription(program, isArabic)}
        </p>
      )}

      <ProgramDetailManager
        programId={program.id}
        canEdit={!program.isDefault}
        days={days}
        allExercises={allExercises}
        isActiveHere={activeEnrollment?.program_id === program.id}
        activeEnrollmentId={activeEnrollment?.program_id === program.id ? activeEnrollment.id : null}
        hasOtherActive={Boolean(activeEnrollment) && activeEnrollment?.program_id !== program.id}
      />
    </div>
  );
}
