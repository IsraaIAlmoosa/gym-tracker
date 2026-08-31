import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import GenderSettingsForm from '@/components/GenderSettingsForm';
import type { WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, age, preferred_weight_unit')
    .eq('id', user.id)
    .maybeSingle();

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;

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

      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <p style={{ color: '#A3A3A3', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t('genderLabel')}
        </p>
        <GenderSettingsForm
          initialGender={profile?.gender ?? null}
          initialAge={profile?.age ?? null}
          initialWeightUnit={weightUnit}
        />
      </div>

      <a
        href={`/${locale}/routines`}
        style={{
          display: 'inline-block',
          color: '#C4F82A',
          fontSize: '14px',
          textDecoration: 'none',
          marginTop: '20px',
        }}
      >
        {t('manageRoutines')}
      </a>
    </div>
  );
}
