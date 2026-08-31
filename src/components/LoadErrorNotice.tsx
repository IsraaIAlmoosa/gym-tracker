type Props = {
  locale: string;
};

export default function LoadErrorNotice({ locale }: Props) {
  const isArabic = locale === 'ar';

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
      <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>
        {isArabic ? 'صار خطأ تقني' : 'Something went wrong'}
      </p>
      <p
        style={{
          color: '#A3A3A3',
          fontSize: '14px',
          maxWidth: '340px',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}
      >
        {isArabic
          ? 'ما قدرنا نجيب البيانات المطلوبة. جرب تحدّث الصفحة، ولو تكررت المشكلة تواصل مع الدعم.'
          : "We couldn't load the required data. Try refreshing the page, and if the problem keeps happening, contact support."}
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
        {isArabic ? '← رجوع للداشبورد' : '← Back to dashboard'}
      </a>
    </div>
  );
}
