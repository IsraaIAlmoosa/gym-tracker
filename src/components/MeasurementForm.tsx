'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveMeasurement, updateMeasurement } from '@/lib/actions/measurements';
import { displayUnitToKg, kgToDisplayUnit, type WeightUnit } from '@/lib/units';

export type EditingMeasurement = {
  id: string;
  measurementDate: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  hipCm: number | null;
  notes: string | null;
};

type Props = {
  weightUnit: WeightUnit;
  editing?: EditingMeasurement | null;
  onSaved?: () => void;
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

function numOrEmpty(value: number | null): string {
  return value === null ? '' : String(value);
}

export default function MeasurementForm({ weightUnit, editing, onSaved }: Props) {
  const t = useTranslations('measurementForm');
  const tUnits = useTranslations('units');
  const router = useRouter();
  const unitLabel = tUnits(weightUnit);

  const [date, setDate] = useState(() => editing?.measurementDate ?? toLocalDateStr(new Date()));
  const [values, setValues] = useState<Record<FieldKey, string>>(() =>
    editing
      ? {
          weight: numOrEmpty(
            editing.weightKg !== null ? kgToDisplayUnit(editing.weightKg, weightUnit) : null
          ),
          waist: numOrEmpty(editing.waistCm),
          chest: numOrEmpty(editing.chestCm),
          arm: numOrEmpty(editing.armCm),
          thigh: numOrEmpty(editing.thighCm),
          hip: numOrEmpty(editing.hipCm),
        }
      : { weight: '', waist: '', chest: '', arm: '', thigh: '', hip: '' }
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const fields: { key: FieldKey; label: string }[] = [
    { key: 'weight', label: t('weight', { unit: unitLabel }) },
    { key: 'waist', label: t('waist') },
    { key: 'chest', label: t('chest') },
    { key: 'arm', label: t('arm') },
    { key: 'thigh', label: t('thigh') },
    { key: 'hip', label: t('hip') },
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
      setErrorMsg(t('errorNoValues'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);

    const enteredWeight = parseOrNull(values.weight);

    const input = {
      measurementDate: date,
      weightKg: enteredWeight !== null ? displayUnitToKg(enteredWeight, weightUnit) : null,
      waistCm: parseOrNull(values.waist),
      chestCm: parseOrNull(values.chest),
      armCm: parseOrNull(values.arm),
      thighCm: parseOrNull(values.thigh),
      hipCm: parseOrNull(values.hip),
      notes: notes.trim() || null,
    };

    const result = editing
      ? await updateMeasurement(editing.id, input)
      : await saveMeasurement(input);

    setSaving(false);

    if (result.success) {
      setSavedMsg(true);
      router.refresh();
      if (editing) {
        onSaved?.();
      } else {
        setValues({ weight: '', waist: '', chest: '', arm: '', thigh: '', hip: '' });
        setNotes('');
      }
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t('date')}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            colorScheme: 'dark',
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
          {t('notes')}
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

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
          {saving ? t('saving') : savedMsg ? t('saved') : editing ? t('update') : t('save')}
        </button>
        {editing && (
          <button
            onClick={() => onSaved?.()}
            style={{
              background: 'none',
              border: 'none',
              color: MUTED,
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
