'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveMeasurement } from '@/lib/actions/measurements';

type Props = {
  locale: string;
};

const ACCENT = '#C4F82A';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

type FieldKey = 'weight' | 'waist' | 'chest' | 'arm' | 'thigh' | 'hip';

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MeasurementForm({ locale }: Props) {
  const isArabic = locale === 'ar';
  const router = useRouter();

  const today = toLocalDateStr(new Date());
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    weight: '',
    waist: '',
    chest: '',
    arm: '',
    thigh: '',
    hip: '',
  });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const t = {
    date: isArabic ? 'التاريخ' : 'Date',
    weight: isArabic ? 'الوزن (كغم)' : 'Weight (kg)',
    waist: isArabic ? 'الخصر (سم)' : 'Waist (cm)',
    chest: isArabic ? 'الصدر (سم)' : 'Chest (cm)',
    arm: isArabic ? 'الذراع (سم)' : 'Arm (cm)',
    thigh: isArabic ? 'الفخذ (سم)' : 'Thigh (cm)',
    hip: isArabic ? 'الورك (سم)' : 'Hip (cm)',
    notes: isArabic ? 'ملاحظات (اختياري)' : 'Notes (optional)',
    save: isArabic ? 'حفظ القياس' : 'Save measurement',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    saved: isArabic ? 'تم الحفظ ✓' : 'Saved ✓',
    errorNoValues: isArabic
      ? 'أدخل قيمة وحدة على الأقل قبل الحفظ'
      : 'Enter at least one value before saving',
    errorGeneric: isArabic ? 'صار خطأ، حاول مرة ثانية' : 'Something went wrong, try again',
  };

  const fields: { key: FieldKey; label: string }[] = [
    { key: 'weight', label: t.weight },
    { key: 'waist', label: t.waist },
    { key: 'chest', label: t.chest },
    { key: 'arm', label: t.arm },
    { key: 'thigh', label: t.thigh },
    { key: 'hip', label: t.hip },
  ];

  function updateField(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function parseOrNull(value: string): number | null {
    if (value.trim() === '') return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  async function handleSave() {
    const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');
    if (!hasAnyValue) {
      setErrorMsg(t.errorNoValues);
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);

    const result = await saveMeasurement({
      measurementDate: date,
      weightKg: parseOrNull(values.weight),
      waistCm: parseOrNull(values.waist),
      chestCm: parseOrNull(values.chest),
      armCm: parseOrNull(values.arm),
      thighCm: parseOrNull(values.thigh),
      hipCm: parseOrNull(values.hip),
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (result.success) {
      setSavedMsg(true);
      setValues({ weight: '', waist: '', chest: '', arm: '', thigh: '', hip: '' });
      setNotes('');
      router.refresh();
    } else {
      setErrorMsg(t.errorGeneric);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t.date}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {fields.map((f) => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: '12px', color: MUTED, marginBottom: '6px' }}>
              {f.label}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={values[f.key]}
              onChange={(e) => updateField(f.key, e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0A0A0A',
                color: '#FFFFFF',
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t.notes}
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 12px' }}>{errorMsg}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          backgroundColor: ACCENT,
          color: '#0A0A0A',
          fontWeight: 700,
          border: 'none',
          borderRadius: '10px',
          padding: '12px 28px',
          fontSize: '14px',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? t.saving : savedMsg ? t.saved : t.save}
      </button>
    </div>
  );
}
