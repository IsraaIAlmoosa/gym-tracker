import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutBuilder from '@/components/WorkoutBuilder';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
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

export default async function NewWorkoutPage({ params }: Props) {
  const { locale } = await params;
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
  for (const row of (lastSetsRaw ?? []) as unknown as LastSetRow[]) {
    if (!lastSetByExercise[row.exercise_id]) {
      lastSetByExercise[row.exercise_id] = { weight: row.weight, reps: row.reps };
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
    />
  );
}
