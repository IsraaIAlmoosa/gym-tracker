'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { deleteInBodyMeasurement } from '@/lib/actions/inbody';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import {
  computeMetricDelta,
  METRIC_DECIMALS,
  type InBodyMeasurement,
  type MetricKey,
} from '@/lib/inbody';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import InBodyForm from '@/components/InBodyForm';

type Props = {
  measurements: InBodyMeasurement[]; // sorted newest first
  weightUnit: WeightUnit;
};

const METRIC_KEYS: MetricKey[] = [
  'weightKg',
  'bodyFatPercentage',
  'skeletalMuscleMassKg',
  'bodyFatMassKg',
  'bmi',
  'basalMetabolicRateKcal',
  'bodyWaterLiters',
  'visceralFatLevel',
  'waistHipRatio',
  'proteinMassKg',
  'mineralMassKg',
];

export default function InBodyHistoryManager({ measurements, weightUnit }: Props) {
  const isArabic = useLocale() === 'ar';
  const t = useTranslations('inbodyHistory');
  const tMetrics = useTranslations('inbody');
  const router = useRouter();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});
  const [compareMode, setCompareMode] = useState(false);
  const [compareAId, setCompareAId] = useState<string>(measurements[1]?.id ?? '');
  const [compareBId, setCompareBId] = useState<string>(measurements[0]?.id ?? '');

  const editingRecord = measurements.find((m) => m.id === editingId) ?? null;

  const metricLabel: Record<MetricKey, string> = {
    weightKg: tMetrics('metrics.weight'),
    bodyFatPercentage: tMetrics('metrics.bodyFatPercentage'),
    skeletalMuscleMassKg: tMetrics('metrics.skeletalMuscleMass'),
    bodyFatMassKg: tMetrics('metrics.bodyFatMass'),
    bmi: tMetrics('metrics.bmi'),
    basalMetabolicRateKcal: tMetrics('metrics.bmr'),
    bodyWaterLiters: tMetrics('metrics.bodyWater'),
    visceralFatLevel: tMetrics('metrics.visceralFat'),
    waistHipRatio: tMetrics('metrics.waistHipRatio'),
    proteinMassKg: tMetrics('metrics.proteinMass'),
    mineralMassKg: tMetrics('metrics.mineralMass'),
  };

  const massKeys = new Set<MetricKey>([
    'weightKg',
    'skeletalMuscleMassKg',
    'bodyFatMassKg',
    'proteinMassKg',
    'mineralMassKg',
  ]);

  function formatValue(key: MetricKey, value: number): string {
    const display = massKeys.has(key) ? kgToDisplayUnit(value, weightUnit) : value;
    return display.toFixed(METRIC_DECIMALS[key]);
  }

  function unitFor(key: MetricKey): string {
    if (massKeys.has(key)) return weightUnit;
    if (key === 'bodyFatPercentage') return '%';
    if (key === 'bodyWaterLiters') return 'L';
    if (key === 'basalMetabolicRateKcal') return tMetrics('kcalUnit');
    return '';
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function monthKey(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', { month: 'long', year: 'numeric' });
  }

  const groups = useMemo(() => {
    const map = new Map<string, InBodyMeasurement[]>();
    for (const m of measurements) {
      const key = monthKey(m.measurementDate);
      const bucket = map.get(key) ?? [];
      bucket.push(m);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurements, isArabic]);

  async function handleDelete(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusyId(id);
    const result = await deleteInBodyMeasurement(id);
    setBusyId(null);
    if (result.success) {
      if (editingId === id) setEditingId(null);
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [id]: t('deleteError') }));
    }
  }

  const compareA = measurements.find((m) => m.id === compareAId) ?? null;
  const compareB = measurements.find((m) => m.id === compareBId) ?? null;

  if (measurements.length === 0) {
    return <EmptyState message={t('empty')} ctaLabel={t('addFirst')} ctaHref="/inbody/new" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setCompareMode((v) => !v)}>
          {compareMode ? t('exitCompare') : t('compare')}
        </Button>
      </div>

      {compareMode && (
        <Card title={t('compare')}>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-text-muted" htmlFor="compare-a">
                {t('compareA')}
              </label>
              <select
                id="compare-a"
                value={compareAId}
                onChange={(e) => setCompareAId(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
              >
                {measurements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDate(m.measurementDate)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-muted" htmlFor="compare-b">
                {t('compareB')}
              </label>
              <select
                id="compare-b"
                value={compareBId}
                onChange={(e) => setCompareBId(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text"
              >
                {measurements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatDate(m.measurementDate)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compareA && compareB && compareA.id !== compareB.id ? (
            <div className="flex flex-col gap-2.5">
              {METRIC_KEYS.map((key) => {
                if (compareB[key] === null) return null;
                const transform = massKeys.has(key) ? (v: number) => kgToDisplayUnit(v, weightUnit) : undefined;
                const delta = computeMetricDelta(compareB, compareA, key, transform);
                return (
                  <div key={key} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <span className="text-sm text-text-muted">{metricLabel[key]}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-text">
                        {formatValue(key, compareB[key]!)} {unitFor(key)}
                      </span>
                      {delta && (
                        <span
                          className={`text-xs font-semibold ${
                            delta.positive === true
                              ? 'text-good'
                              : delta.positive === false
                                ? 'text-warn'
                                : 'text-text-muted'
                          }`}
                        >
                          {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '→'} {delta.text}{' '}
                          {unitFor(key)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="m-0 text-sm text-text-muted">{t('compareSelectTwo')}</p>
          )}
        </Card>
      )}

      {editingRecord && (
        <Card title={t('editTitle')}>
          <InBodyForm
            key={editingRecord.id}
            weightUnit={weightUnit}
            editing={editingRecord}
            onSaved={() => setEditingId(null)}
          />
        </Card>
      )}

      {groups.map(([month, rows]) => (
        <div key={month}>
          <h3 className="mb-2 mt-1 text-sm font-semibold text-text-muted">{month}</h3>
          <div className="flex flex-col gap-2.5">
            {rows.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs text-text-muted">{formatDate(m.measurementDate)}</span>
                  <div className="flex gap-3.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(m.id)}
                      disabled={busyId === m.id}
                      className="border-none bg-transparent p-0 text-xs text-accent"
                    >
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      disabled={busyId === m.id}
                      className="border-none bg-transparent p-0 text-xs text-warn"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>

                {errorMsg[m.id] && <p className="m-0 mb-2.5 text-xs text-warn">{errorMsg[m.id]}</p>}

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {m.weightKg !== null && (
                    <div>
                      <div className="text-[11px] text-text-faint">{tMetrics('metrics.weight')}</div>
                      <div className="text-sm font-bold text-text">{formatValue('weightKg', m.weightKg)} {weightUnit}</div>
                    </div>
                  )}
                  {m.bodyFatPercentage !== null && (
                    <div>
                      <div className="text-[11px] text-text-faint">{tMetrics('metrics.bodyFatPercentage')}</div>
                      <div className="text-sm font-bold text-text">{m.bodyFatPercentage.toFixed(1)}%</div>
                    </div>
                  )}
                  {m.skeletalMuscleMassKg !== null && (
                    <div>
                      <div className="text-[11px] text-text-faint">{tMetrics('metrics.skeletalMuscleMass')}</div>
                      <div className="text-sm font-bold text-text">
                        {formatValue('skeletalMuscleMassKg', m.skeletalMuscleMassKg)} {weightUnit}
                      </div>
                    </div>
                  )}
                  {m.bmi !== null && (
                    <div>
                      <div className="text-[11px] text-text-faint">{tMetrics('metrics.bmi')}</div>
                      <div className="text-sm font-bold text-text">{m.bmi.toFixed(1)}</div>
                    </div>
                  )}
                </div>
                {m.notes && <p className="m-0 mt-2.5 text-sm text-text-muted">{m.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
