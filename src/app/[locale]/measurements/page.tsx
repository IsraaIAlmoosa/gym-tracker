import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import MeasurementsManager, { type MeasurementRow } from '@/components/MeasurementsManager';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function MeasurementsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'measurements' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('preferred_weight_unit')
    .eq('id', user.id)
    .maybeSingle();

  const { data: rows, error: rowsError } = await supabase
    .from('body_measurements')
    .select('id, measurement_date, weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm, hip_cm, notes')
    .order('measurement_date', { ascending: false });

  if (profileError || rowsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const measurements: MeasurementRow[] = rows ?? [];

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

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 24px' }}>{t('title')}</h1>

      <MeasurementsManager measurements={measurements} weightUnit={weightUnit} />
    </div>
  );
}
