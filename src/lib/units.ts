export type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.20462;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function kgToDisplayUnit(kg: number, unit: WeightUnit): number {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(value * 10) / 10;
}

export function displayUnitToKg(value: number, unit: WeightUnit): number {
  const kg = unit === 'lb' ? lbToKg(value) : value;
  return Math.round(kg * 100) / 100;
}

export function weightUnitLabel(unit: WeightUnit, isArabic: boolean): string {
  if (unit === 'lb') return isArabic ? 'باوند' : 'lb';
  return isArabic ? 'كغم' : 'kg';
}
