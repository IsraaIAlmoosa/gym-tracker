export type SegmentalPart = { leanKg: number; fatKg: number };

export type SegmentalData = {
  leftArm?: SegmentalPart;
  rightArm?: SegmentalPart;
  trunk?: SegmentalPart;
  leftLeg?: SegmentalPart;
  rightLeg?: SegmentalPart;
};

export type InBodyMeasurement = {
  id: string;
  measurementDate: string;
  heightCm: number | null;
  weightKg: number | null;
  skeletalMuscleMassKg: number | null;
  bodyFatPercentage: number | null;
  bodyFatMassKg: number | null;
  bmi: number | null;
  basalMetabolicRateKcal: number | null;
  bodyWaterLiters: number | null;
  visceralFatLevel: number | null;
  waistHipRatio: number | null;
  proteinMassKg: number | null;
  mineralMassKg: number | null;
  segmentalData: SegmentalData | null;
  notes: string | null;
};

export type InBodyRow = {
  id: string;
  measurement_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  skeletal_muscle_mass_kg: number | null;
  body_fat_percentage: number | null;
  body_fat_mass_kg: number | null;
  bmi: number | null;
  basal_metabolic_rate_kcal: number | null;
  body_water_liters: number | null;
  visceral_fat_level: number | null;
  waist_hip_ratio: number | null;
  protein_mass_kg: number | null;
  mineral_mass_kg: number | null;
  segmental_data: SegmentalData | null;
  notes: string | null;
};

/** Maps a raw Supabase row (snake_case) to the domain type used throughout the UI. */
export function mapInBodyRow(row: InBodyRow): InBodyMeasurement {
  return {
    id: row.id,
    measurementDate: row.measurement_date,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    skeletalMuscleMassKg: row.skeletal_muscle_mass_kg,
    bodyFatPercentage: row.body_fat_percentage,
    bodyFatMassKg: row.body_fat_mass_kg,
    bmi: row.bmi,
    basalMetabolicRateKcal: row.basal_metabolic_rate_kcal,
    bodyWaterLiters: row.body_water_liters,
    visceralFatLevel: row.visceral_fat_level,
    waistHipRatio: row.waist_hip_ratio,
    proteinMassKg: row.protein_mass_kg,
    mineralMassKg: row.mineral_mass_kg,
    segmentalData: row.segmental_data,
    notes: row.notes,
  };
}

export type MetricKey =
  | 'weightKg'
  | 'skeletalMuscleMassKg'
  | 'bodyFatPercentage'
  | 'bodyFatMassKg'
  | 'bmi'
  | 'basalMetabolicRateKcal'
  | 'bodyWaterLiters'
  | 'visceralFatLevel'
  | 'waistHipRatio'
  | 'proteinMassKg'
  | 'mineralMassKg';

type MetricDirection = 'lower_is_better' | 'higher_is_better' | 'neutral';

/**
 * Whether a lower or higher value is generally favorable for each metric.
 * 'neutral' metrics (weight, BMI, BMR, waist/hip ratio, mineral mass) are
 * goal-dependent or not simply "good/bad" — we show direction but never
 * color-code them as an improvement or regression.
 */
export const METRIC_DIRECTION: Record<MetricKey, MetricDirection> = {
  weightKg: 'neutral',
  skeletalMuscleMassKg: 'higher_is_better',
  bodyFatPercentage: 'lower_is_better',
  bodyFatMassKg: 'lower_is_better',
  bmi: 'neutral',
  basalMetabolicRateKcal: 'neutral',
  bodyWaterLiters: 'higher_is_better',
  visceralFatLevel: 'lower_is_better',
  waistHipRatio: 'neutral',
  proteinMassKg: 'higher_is_better',
  mineralMassKg: 'neutral',
};

/** Number of decimal places to display for each metric. */
export const METRIC_DECIMALS: Record<MetricKey, number> = {
  weightKg: 1,
  skeletalMuscleMassKg: 1,
  bodyFatPercentage: 1,
  bodyFatMassKg: 1,
  bmi: 1,
  basalMetabolicRateKcal: 0,
  bodyWaterLiters: 1,
  visceralFatLevel: 0,
  waistHipRatio: 2,
  proteinMassKg: 1,
  mineralMassKg: 1,
};

export function computeBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (weightKg === null || heightCm === null || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Latest known height across a user's measurements — most people don't remeasure height every time. */
export function resolveHeightCm(
  measurements: { measurementDate: string; heightCm: number | null }[]
): number | null {
  const withHeight = measurements
    .filter((m) => m.heightCm !== null)
    .sort((a, b) => (a.measurementDate < b.measurementDate ? 1 : -1));
  return withHeight[0]?.heightCm ?? null;
}

export type MetricDelta = {
  text: string;
  direction: 'up' | 'down' | 'flat';
  positive?: boolean;
};

/**
 * Builds a MetricCard-compatible delta between two measurements for a given metric.
 * `displayTransform` converts the stored (kg-based) value into display units — e.g.
 * kg → lb — before diffing/formatting, so the shown delta matches the shown value.
 * Direction/positive are unaffected since the transform is sign-preserving.
 */
export function computeMetricDelta(
  current: InBodyMeasurement,
  previous: InBodyMeasurement | null,
  key: MetricKey,
  displayTransform?: (value: number) => number
): MetricDelta | null {
  const currentValue = current[key];
  const previousValue = previous?.[key] ?? null;
  if (currentValue === null || previousValue === null) return null;

  const currentDisplay = displayTransform ? displayTransform(currentValue) : currentValue;
  const previousDisplay = displayTransform ? displayTransform(previousValue) : previousValue;
  const diff = currentDisplay - previousDisplay;
  const decimals = METRIC_DECIMALS[key];
  const direction: MetricDelta['direction'] = diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down';

  const dir = METRIC_DIRECTION[key];
  const positive =
    dir === 'neutral' || direction === 'flat'
      ? undefined
      : dir === 'higher_is_better'
        ? direction === 'up'
        : direction === 'down';

  return {
    text: Math.abs(diff).toFixed(decimals),
    direction,
    positive,
  };
}
