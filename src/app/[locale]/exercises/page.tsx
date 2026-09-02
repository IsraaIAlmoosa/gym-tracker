import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import ExerciseLibrary from '@/components/ExerciseLibrary';
import type { LibraryExercise } from '@/components/ExerciseCard';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ExercisesPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'exercises' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: exerciseRows, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name_ar, name_en, muscle_group_ar, muscle_group_en, equipment_ar, equipment_en, impact_level')
    .order(isArabic ? 'name_ar' : 'name_en');

  if (exercisesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const exercises: LibraryExercise[] = (exerciseRows ?? []).map((ex) => ({
    id: ex.id,
    nameAr: ex.name_ar,
    nameEn: ex.name_en,
    muscleGroup: isArabic ? ex.muscle_group_ar : ex.muscle_group_en,
    equipment: isArabic ? ex.equipment_ar : ex.equipment_en,
    impactLevel: ex.impact_level,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-1 text-2xl font-bold text-text lg:text-3xl">{t('title')}</h1>
      <p className="m-0 mb-6 text-[15px] text-text-muted">{t('subtitle', { n: exercises.length })}</p>
      <ExerciseLibrary exercises={exercises} isArabic={isArabic} />
    </div>
  );
}
