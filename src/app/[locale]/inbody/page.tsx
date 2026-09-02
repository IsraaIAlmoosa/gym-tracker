import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import InBodyMetricsGrid from '@/components/InBodyMetricsGrid';
import InBodyCharts from '@/components/InBodyCharts';
import InBodySegmentalPanel from '@/components/InBodySegmentalPanel';
import { mapInBodyRow, type InBodyRow } from '@/lib/inbody';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

const ROW_COLUMNS =
  'id, measurement_date, height_cm, weight_kg, skeletal_muscle_mass_kg, body_fat_percentage, body_fat_mass_kg, bmi, basal_metabolic_rate_kcal, body_water_liters, visceral_fat_level, waist_hip_ratio, protein_mass_kg, mineral_mass_kg, segmental_data, notes';

export default async function InBodyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'inbody' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [
    { data: profile, error: profileError },
    { data: rows, error: rowsError },
  ] = await Promise.all([
    supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).maybeSingle(),
    supabase
      .from('inbody_measurements')
      .select(ROW_COLUMNS)
      .order('measurement_date', { ascending: false })
      .limit(60),
  ]);

  if (profileError || rowsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const measurements = ((rows ?? []) as unknown as InBodyRow[]).map(mapInBodyRow);
  const latest = measurements[0] ?? null;
  const previous = measurements[1] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="m-0 mb-1 text-2xl font-bold text-text lg:text-3xl">{t('title')}</h1>
          <p className="m-0 text-[15px] text-text-muted">{t('subtitle')}</p>
        </div>
        <Button href="/inbody/new">{t('addNew')}</Button>
      </div>

      {measurements.length === 0 ? (
        <Card>
          <EmptyState message={t('emptyDashboard')} ctaLabel={t('addNew')} ctaHref="/inbody/new" />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {latest && <InBodyMetricsGrid latest={latest} previous={previous} weightUnit={weightUnit} />}

          <Card title={t('trendsTitle')}>
            <InBodyCharts measurements={measurements} weightUnit={weightUnit} />
          </Card>

          {latest?.segmentalData && (
            <Card title={t('segmentalTitleDashboard')}>
              <InBodySegmentalPanel segmentalData={latest.segmentalData} />
            </Card>
          )}

          <div className="flex flex-wrap gap-3">
            <Button href="/inbody/history" variant="secondary">
              {t('viewHistory')}
            </Button>
            <Button href="/measurements" variant="ghost">
              {t('bodyMeasurementsLink')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
