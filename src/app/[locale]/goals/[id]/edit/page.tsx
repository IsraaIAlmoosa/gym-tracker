import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import Card from '@/components/ui/Card';
import GoalForm from '@/components/GoalForm';
import { mapGoalRow, type GoalCurrentValueContext, type GoalRow } from '@/lib/goals';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const EMPTY_CURRENT_VALUES: GoalCurrentValueContext = {
  latestWeightKg: null,
  latestBodyFatPercentage: null,
  exerciseMaxWeightKg: {},
  sessionsLast7Days: 0,
};

export default async function EditGoalPage({ params }: Props) {
  const { locale, id } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'goalForm' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [
    { data: profile, error: profileError },
    { data: goalRow, error: goalError },
    { data: exerciseRows, error: exercisesError },
  ] = await Promise.all([
    supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).maybeSingle(),
    supabase.from('goals').select('*').eq('id', id).maybeSingle(),
    supabase.from('exercises').select('id, name_ar, name_en').order(isArabic ? 'name_ar' : 'name_en'),
  ]);

  if (profileError || goalError || exercisesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  if (!goalRow) {
    redirect(`/${locale}/goals`);
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const goal = mapGoalRow(goalRow as unknown as GoalRow);
  const exercises = (exerciseRows ?? []).map((ex) => ({
    id: ex.id,
    name: isArabic ? ex.name_ar : ex.name_en,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-6 text-2xl font-bold text-text">{t('editTitle')}</h1>
      <Card>
        <GoalForm weightUnit={weightUnit} exercises={exercises} currentValues={EMPTY_CURRENT_VALUES} editing={goal} />
      </Card>
    </div>
  );
}
