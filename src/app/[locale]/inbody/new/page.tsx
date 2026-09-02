import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import Card from '@/components/ui/Card';
import InBodyForm from '@/components/InBodyForm';
import { resolveHeightCm } from '@/lib/inbody';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewInBodyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'inbodyForm' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [
    { data: profile, error: profileError },
    { data: heightRows, error: heightError },
  ] = await Promise.all([
    supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).maybeSingle(),
    supabase
      .from('inbody_measurements')
      .select('measurement_date, height_cm')
      .order('measurement_date', { ascending: false })
      .limit(20),
  ]);

  if (profileError || heightError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const latestHeightCm = resolveHeightCm(
    (heightRows ?? []).map((r) => ({ measurementDate: r.measurement_date, heightCm: r.height_cm }))
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-6 text-2xl font-bold text-text">{t('addTitle')}</h1>
      <Card>
        <InBodyForm weightUnit={weightUnit} latestHeightCm={latestHeightCm} />
      </Card>
    </div>
  );
}
