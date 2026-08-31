import { getTranslations } from 'next-intl/server';

type Props = {
  locale: string;
};

export default async function LoadErrorNotice({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'loadErrorNotice' });

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <p style={{ fontSize: '32px', margin: '0 0 12px' }}>⚠️</p>
      <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>{t('title')}</p>
      <p
        style={{
          color: '#A3A3A3',
          fontSize: '14px',
          maxWidth: '340px',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}
      >
        {t('description')}
      </p>
      <a
        href={`/${locale}/dashboard`}
        style={{
          color: '#C4F82A',
          fontSize: '14px',
          textDecoration: 'none',
          border: '1px solid #C4F82A',
          borderRadius: '8px',
          padding: '10px 20px',
        }}
      >
        {t('back')}
      </a>
    </div>
  );
}
