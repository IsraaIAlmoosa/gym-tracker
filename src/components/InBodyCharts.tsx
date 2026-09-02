'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import InBodyTrendChart from '@/components/InBodyTrendChart';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { toLocalDateStr } from '@/lib/analytics';

type Row = {
  measurementDate: string;
  weightKg: number | null;
  bodyFatPercentage: number | null;
  skeletalMuscleMassKg: number | null;
};

type Props = {
  measurements: Row[];
  weightUnit: WeightUnit;
};

type Range = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '1m': 30, '3m': 90, '6m': 182, '1y': 365 };
const RANGES: Range[] = ['1m', '3m', '6m', '1y', 'all'];

export default function InBodyCharts({ measurements, weightUnit }: Props) {
  const t = useTranslations('inbody');
  const tUnits = useTranslations('units');
  const [range, setRange] = useState<Range>('6m');

  const filtered = useMemo(() => {
    const sorted = [...measurements].sort((a, b) => (a.measurementDate < b.measurementDate ? -1 : 1));
    if (range === 'all') return sorted;
    const days = RANGE_DAYS[range];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toLocalDateStr(cutoff);
    return sorted.filter((m) => m.measurementDate >= cutoffStr);
  }, [measurements, range]);

  const weightPoints = filtered
    .filter((m) => m.weightKg !== null)
    .map((m) => ({ date: m.measurementDate, value: kgToDisplayUnit(m.weightKg!, weightUnit) }));

  const bodyFatPoints = filtered
    .filter((m) => m.bodyFatPercentage !== null)
    .map((m) => ({ date: m.measurementDate, value: m.bodyFatPercentage! }));

  const musclePoints = filtered
    .filter((m) => m.skeletalMuscleMassKg !== null)
    .map((m) => ({ date: m.measurementDate, value: kgToDisplayUnit(m.skeletalMuscleMassKg!, weightUnit) }));

  const hasAnyData = weightPoints.length > 0 || bodyFatPoints.length > 0 || musclePoints.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              range === r ? 'bg-accent text-accent-ink' : 'bg-surface-raised text-text-muted'
            }`}
          >
            {t(`range.${r}`)}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <p className="m-0 text-sm text-text-muted">{t('chartsEmpty')}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {weightPoints.length >= 2 && (
            <InBodyTrendChart label={t('metrics.weight')} unit={tUnits(weightUnit)} points={weightPoints} />
          )}
          {bodyFatPoints.length >= 2 && (
            <InBodyTrendChart label={t('metrics.bodyFatPercentage')} unit="%" points={bodyFatPoints} />
          )}
          {musclePoints.length >= 2 && (
            <InBodyTrendChart label={t('metrics.skeletalMuscleMass')} unit={tUnits(weightUnit)} points={musclePoints} />
          )}
        </div>
      )}
    </div>
  );
}
