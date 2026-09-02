import { useTranslations } from 'next-intl';
import MetricCard from '@/components/ui/MetricCard';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { computeMetricDelta, METRIC_DECIMALS, type InBodyMeasurement, type MetricKey } from '@/lib/inbody';

type Props = {
  latest: InBodyMeasurement;
  previous: InBodyMeasurement | null;
  weightUnit: WeightUnit;
};

export default function InBodyMetricsGrid({ latest, previous, weightUnit }: Props) {
  const t = useTranslations('inbody');
  const tUnits = useTranslations('units');
  const massUnit = tUnits(weightUnit);

  function displayMass(kg: number): number {
    return kgToDisplayUnit(kg, weightUnit);
  }

  const metrics: {
    key: MetricKey;
    label: string;
    displayValue: number;
    unit?: string;
    transform?: (v: number) => number;
  }[] = [];

  function push(
    key: MetricKey,
    label: string,
    rawValue: number | null,
    unit?: string,
    transform?: (v: number) => number
  ) {
    if (rawValue === null) return;
    metrics.push({ key, label, displayValue: transform ? transform(rawValue) : rawValue, unit, transform });
  }

  push('weightKg', t('metrics.weight'), latest.weightKg, massUnit, displayMass);
  push('bodyFatPercentage', t('metrics.bodyFatPercentage'), latest.bodyFatPercentage, '%');
  push('skeletalMuscleMassKg', t('metrics.skeletalMuscleMass'), latest.skeletalMuscleMassKg, massUnit, displayMass);
  push('bodyFatMassKg', t('metrics.bodyFatMass'), latest.bodyFatMassKg, massUnit, displayMass);
  push('bmi', t('metrics.bmi'), latest.bmi);
  push('basalMetabolicRateKcal', t('metrics.bmr'), latest.basalMetabolicRateKcal, t('kcalUnit'));
  push('bodyWaterLiters', t('metrics.bodyWater'), latest.bodyWaterLiters, 'L');
  push('visceralFatLevel', t('metrics.visceralFat'), latest.visceralFatLevel);
  push('waistHipRatio', t('metrics.waistHipRatio'), latest.waistHipRatio);
  push('proteinMassKg', t('metrics.proteinMass'), latest.proteinMassKg, massUnit, displayMass);
  push('mineralMassKg', t('metrics.mineralMass'), latest.mineralMassKg, massUnit, displayMass);

  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => {
        const rawDelta = computeMetricDelta(latest, previous, m.key, m.transform);
        const delta = rawDelta ? { ...rawDelta, text: m.unit ? `${rawDelta.text} ${m.unit}` : rawDelta.text } : undefined;
        return (
          <MetricCard
            key={m.key}
            label={m.label}
            value={m.displayValue.toFixed(METRIC_DECIMALS[m.key])}
            unit={m.unit}
            delta={delta}
          />
        );
      })}
    </div>
  );
}
