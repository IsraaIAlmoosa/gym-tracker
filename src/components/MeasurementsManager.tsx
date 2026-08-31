'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { deleteMeasurement } from '@/lib/actions/measurements';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import MeasurementForm, { type EditingMeasurement } from '@/components/MeasurementForm';

export type MeasurementRow = {
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

type Props = {
  measurements: MeasurementRow[];
  weightUnit: WeightUnit;
};

const FIELD_KEYS = ['weight_kg', 'waist_cm', 'chest_cm', 'arm_cm', 'thigh_cm', 'hip_cm'] as const;

const UNITS: Record<(typeof FIELD_KEYS)[number], string> = {
  weight_kg: 'kg',
  waist_cm: 'cm',
  chest_cm: 'cm',
  arm_cm: 'cm',
  thigh_cm: 'cm',
  hip_cm: 'cm',
};

export default function MeasurementsManager({ measurements, weightUnit }: Props) {
  const isArabic = useLocale() === 'ar';
  const t = useTranslations('measurements');
  const tUnits = useTranslations('units');
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  const editingRecord = measurements.find((m) => m.id === editingId) ?? null;
  const editingForForm: EditingMeasurement | null = editingRecord
    ? {
        id: editingRecord.id,
        measurementDate: editingRecord.measurement_date,
        weightKg: editingRecord.weight_kg,
        waistCm: editingRecord.waist_cm,
        chestCm: editingRecord.chest_cm,
        armCm: editingRecord.arm_cm,
        thighCm: editingRecord.thigh_cm,
        hipCm: editingRecord.hip_cm,
        notes: editingRecord.notes,
      }
    : null;

  async function handleDelete(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusyId(id);
    const result = await deleteMeasurement(id);
    setBusyId(null);
    if (result.success) {
      if (editingId === id) setEditingId(null);
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [id]: t('deleteError') }));
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <>
      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>
          {editingForForm ? t('editTitle') : t('addNew')}
        </h2>
        <MeasurementForm
          key={editingId ?? 'new'}
          weightUnit={weightUnit}
          editing={editingForForm}
          onSaved={() => setEditingId(null)}
        />
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px' }}>{t('history')}</h2>

      {measurements.length === 0 ? (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t('noHistory')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {measurements.map((m, index) => {
            const previous = measurements[index + 1];
            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#171717',
                  border: m.id === editingId ? '1px solid #C4F82A' : '1px solid #262626',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#A3A3A3' }}>
                    {formatDate(m.measurement_date)}
                  </span>
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <button
                      onClick={() => setEditingId(m.id)}
                      disabled={busyId === m.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#C4F82A',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={busyId === m.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#F87171',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>

                {errorMsg[m.id] && (
                  <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 10px' }}>
                    {errorMsg[m.id]}
                  </p>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {FIELD_KEYS.map((key) => {
                    const rawValue = m[key];
                    if (rawValue === null) return null;
                    const rawPrevValue = previous ? previous[key] : null;

                    const isWeight = key === 'weight_kg';
                    const value = isWeight ? kgToDisplayUnit(rawValue, weightUnit) : rawValue;
                    const prevValue =
                      isWeight && rawPrevValue !== null && rawPrevValue !== undefined
                        ? kgToDisplayUnit(rawPrevValue, weightUnit)
                        : rawPrevValue;
                    const unit = isWeight ? tUnits(weightUnit) : UNITS[key];
                    const delta =
                      prevValue !== null && prevValue !== undefined ? value - prevValue : null;
                    return (
                      <div key={key}>
                        <div style={{ fontSize: '11px', color: '#737373' }}>{t(`labels.${key}`)}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>
                          {value} {unit}
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
    </>
  );
}
