import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import ActivityForm from '@/components/ActivityForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewActivityPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'activities' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

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
        <ActivityForm />
      </div>
    </div>
  );
}
