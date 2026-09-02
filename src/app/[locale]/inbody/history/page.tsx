import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import InBodyHistoryManager from '@/components/InBodyHistoryManager';
import { mapInBodyRow, type InBodyRow } from '@/lib/inbody';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

const ROW_COLUMNS =
  'id, measurement_date, height_cm, weight_kg, skeletal_muscle_mass_kg, body_fat_percentage, body_fat_mass_kg, bmi, basal_metabolic_rate_kcal, body_water_liters, visceral_fat_level, waist_hip_ratio, protein_mass_kg, mineral_mass_kg, segmental_data, notes';

export default async function InBodyHistoryPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'inbodyHistory' });

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
    supabase.from('inbody_measurements').select(ROW_COLUMNS).order('measurement_date', { ascending: false }),
  ]);

  if (profileError || rowsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const measurements = ((rows ?? []) as unknown as InBodyRow[]).map(mapInBodyRow);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-6 text-2xl font-bold text-text">{t('title')}</h1>
      <InBodyHistoryManager measurements={measurements} weightUnit={weightUnit} />
    </div>
  );
}
