import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import RoutineManager from '@/components/RoutineManager';
import LoadErrorNotice from '@/components/LoadErrorNotice';

type Props = {
  params: Promise<{ locale: string }>;
};

type ExerciseNameRow = { name_ar: string; name_en: string };

type RoutineExerciseRow = {
  id: string;
  exercise_id: string;
  order_index: number;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

type RoutineRow = {
  id: string;
  name: string;
  routine_exercises: RoutineExerciseRow[];
};

export default async function RoutinesPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'routines' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: routinesRaw, error: routinesError } = await supabase
    .from('routines')
    .select(
      'id, name, routine_exercises(id, exercise_id, order_index, exercises(name_ar, name_en))'
    )
    .order('created_at', { ascending: false })
    .order('order_index', { referencedTable: 'routine_exercises', ascending: true });

  const { data: allExercisesRaw, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name_ar, name_en')
    .order(isArabic ? 'name_ar' : 'name_en');

  if (routinesError || exercisesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const routines = ((routinesRaw ?? []) as unknown as RoutineRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    exercises: r.routine_exercises.map((re) => {
      const ex = Array.isArray(re.exercises) ? re.exercises[0] : re.exercises;
      return {
        exerciseId: re.exercise_id,
        name: ex ? (isArabic ? ex.name_ar : ex.name_en) : '',
      };
    }),
  }));

  const allExercises = allExercisesRaw ?? [];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        padding: '24px',
        paddingBottom: '100px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <a
        href={`/${locale}/dashboard`}
        style={{ color: '#A3A3A3', fontSize: '14px', textDecoration: 'none' }}
      >
        {t('back')}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 8px' }}>{t('title')}</h1>
      <p style={{ color: '#A3A3A3', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
        {t('intro')}
      </p>

      <RoutineManager routines={routines} allExercises={allExercises} />
    </div>
  );
}
