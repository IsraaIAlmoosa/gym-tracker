import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MeasurementForm from '@/components/MeasurementForm';

type Props = {
  params: Promise<{ locale: string }>;
};

type MeasurementRow = {
  id: string;
  measurement_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hip_cm: number | null;
  notes: string | null;
};

const FIELD_KEYS = ['weight_kg', 'waist_cm', 'chest_cm', 'arm_cm', 'thigh_cm', 'hip_cm'] as const;

export default async function MeasurementsPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: rows } = await supabase
    .from('body_measurements')
    .select('id, measurement_date, weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm, hip_cm, notes')
    .order('measurement_date', { ascending: false });

  const measurements: MeasurementRow[] = rows ?? [];

  const t = {
    title: isArabic ? 'قياسات الجسم' : 'Body Measurements',
    back: isArabic ? '← رجوع للداشبورد' : '← Back to dashboard',
    addNew: isArabic ? 'إضافة قياس جديد' : 'Add new measurement',
    history: isArabic ? 'السجل' : 'History',
    noHistory: isArabic
      ? 'لسا ما سجلت أي قياس. أضف أول قياس من فوق.'
      : "You haven't logged any measurement yet. Add your first one above.",
    labels: {
      weight_kg: isArabic ? 'الوزن' : 'Weight',
      waist_cm: isArabic ? 'الخصر' : 'Waist',
      chest_cm: isArabic ? 'الصدر' : 'Chest',
      arm_cm: isArabic ? 'الذراع' : 'Arm',
      thigh_cm: isArabic ? 'الفخذ' : 'Thigh',
      hip_cm: isArabic ? 'الورك' : 'Hip',
    } as Record<(typeof FIELD_KEYS)[number], string>,
    units: {
      weight_kg: 'kg',
      waist_cm: 'cm',
      chest_cm: 'cm',
      arm_cm: 'cm',
      thigh_cm: 'cm',
      hip_cm: 'cm',
    } as Record<(typeof FIELD_KEYS)[number], string>,
  };

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
        {t.back}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 24px' }}>{t.title}</h1>

      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>{t.addNew}</h2>
        <MeasurementForm locale={locale} />
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>{t.history}</h2>

      {measurements.length === 0 ? (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t.noHistory}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {measurements.map((m, index) => {
            const previous = measurements[index + 1];
            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#171717',
                  border: '1px solid #262626',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#A3A3A3', marginBottom: '10px' }}>
                  {formatDate(m.measurement_date)}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {FIELD_KEYS.map((key) => {
                    const value = m[key];
                    if (value === null) return null;
                    const prevValue = previous ? previous[key] : null;
                    const delta =
                      prevValue !== null && prevValue !== undefined ? value - prevValue : null;
                    return (
                      <div key={key}>
                        <div style={{ fontSize: '11px', color: '#737373' }}>{t.labels[key]}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>
                          {value} {t.units[key]}
                        </div>
                        {delta !== null && delta !== 0 && (
                          <div style={{ fontSize: '11px', color: '#A3A3A3' }}>
                            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {m.notes && (
                  <p style={{ fontSize: '13px', color: '#D4D4D4', marginTop: '10px', marginBottom: 0 }}>
                    {m.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
