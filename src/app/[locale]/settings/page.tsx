import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import GenderSettingsForm from '@/components/GenderSettingsForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, age')
    .eq('id', user.id)
    .maybeSingle();

  const t = {
    title: isArabic ? 'الإعدادات' : 'Settings',
    back: isArabic ? '← رجوع للداشبورد' : '← Back to dashboard',
    genderLabel: isArabic
      ? 'حتى نخاطبك بالصيغة الصحيحة بالعربي، ونرتب اقتراحات التمارين بشكل يناسبك'
      : "So we can address you correctly and tailor suggestions to you",
  };

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
        {t.back}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 24px' }}>{t.title}</h1>

      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <p style={{ color: '#A3A3A3', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.6 }}>
          {t.genderLabel}
        </p>
        <GenderSettingsForm
          locale={locale}
          initialGender={profile?.gender ?? null}
          initialAge={profile?.age ?? null}
        />
      </div>
    </div>
  );
}
