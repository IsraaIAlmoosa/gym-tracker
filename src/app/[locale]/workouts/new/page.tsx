import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkoutBuilder from '@/components/WorkoutBuilder';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
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

  if (profileError || exercisesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const allExercises = exercises ?? [];

  const availableExercises = allExercises.filter((ex) => {
    const areas: string[] = ex.affects_areas ?? [];
    return !areas.some((a) => avoidedAreas.includes(a));
  });

  const hiddenCount = allExercises.length - availableExercises.length;

  return (
    <WorkoutBuilder
      locale={locale}
      exercises={availableExercises}
      hiddenCount={hiddenCount}
      gender={gender}
      age={age}
      weightUnit={weightUnit}
    />
  );
}
