import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import Card from '@/components/ui/Card';
import GoalForm from '@/components/GoalForm';
import type { GoalCurrentValueContext } from '@/lib/goals';
import { toLocalDateStr } from '@/lib/analytics';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewGoalPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'goalForm' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const weekAgoStr = toLocalDateStr(new Date(new Date().getTime() - 6 * 24 * 60 * 60 * 1000));

  const [
    { data: profile, error: profileError },
    { data: exerciseRows, error: exercisesError },
    { data: bodyMeasurementRows, error: bodyMeasurementsError },
    { data: inbodyRows, error: inbodyError },
    { data: setRows, error: setsError },
    { data: recentSessions, error: sessionsError },
  ] = await Promise.all([
    supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).maybeSingle(),
    supabase.from('exercises').select('id, name_ar, name_en').order(isArabic ? 'name_ar' : 'name_en'),
    supabase.from('body_measurements').select('measurement_date, weight_kg').order('measurement_date', { ascending: false }).limit(1),
    supabase
      .from('inbody_measurements')
      .select('measurement_date, weight_kg, body_fat_percentage')
      .order('measurement_date', { ascending: false })
      .limit(1),
    supabase.from('workout_sets').select('exercise_id, weight'),
    supabase.from('workout_sessions').select('id').gte('date', weekAgoStr),
  ]);

  if (profileError || exercisesError || bodyMeasurementsError || inbodyError || setsError || sessionsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const exercises = (exerciseRows ?? []).map((ex) => ({
    id: ex.id,
    name: isArabic ? ex.name_ar : ex.name_en,
  }));

  const bodyMeasurement = bodyMeasurementRows?.[0] ?? null;
  const inbody = inbodyRows?.[0] ?? null;
  const latestWeightKg =
    bodyMeasurement && inbody
      ? (bodyMeasurement.measurement_date >= inbody.measurement_date ? bodyMeasurement.weight_kg : inbody.weight_kg)
      : (bodyMeasurement?.weight_kg ?? inbody?.weight_kg ?? null);

  const exerciseMaxWeightKg: Record<string, number> = {};
  for (const row of setRows ?? []) {
    const current = exerciseMaxWeightKg[row.exercise_id];
    if (current === undefined || row.weight > current) {
      exerciseMaxWeightKg[row.exercise_id] = row.weight;
    }
  }

  const currentValues: GoalCurrentValueContext = {
    latestWeightKg,
    latestBodyFatPercentage: inbody?.body_fat_percentage ?? null,
    exerciseMaxWeightKg,
    sessionsLast7Days: (recentSessions ?? []).length,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-6 text-2xl font-bold text-text">{t('addTitle')}</h1>
      <Card>
        <GoalForm weightUnit={weightUnit} exercises={exercises} currentValues={currentValues} />
      </Card>
    </div>
  );
}
