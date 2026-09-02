'use server';

import { createClient } from '@/lib/supabase/server';
import type { SegmentalData } from '@/lib/inbody';

type SaveInBodyInput = {
  measurementDate: string; // YYYY-MM-DD
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

type SaveInBodyResult = { success: true } | { success: false; error: string };

function toRow(input: SaveInBodyInput) {
  return {
    measurement_date: input.measurementDate,
    height_cm: input.heightCm,
    weight_kg: input.weightKg,
    skeletal_muscle_mass_kg: input.skeletalMuscleMassKg,
    body_fat_percentage: input.bodyFatPercentage,
    body_fat_mass_kg: input.bodyFatMassKg,
    bmi: input.bmi,
    basal_metabolic_rate_kcal: input.basalMetabolicRateKcal,
    body_water_liters: input.bodyWaterLiters,
    visceral_fat_level: input.visceralFatLevel,
    waist_hip_ratio: input.waistHipRatio,
    protein_mass_kg: input.proteinMassKg,
    mineral_mass_kg: input.mineralMassKg,
    segmental_data: input.segmentalData,
    notes: input.notes,
  };
}

export async function saveInBodyMeasurement(input: SaveInBodyInput): Promise<SaveInBodyResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('inbody_measurements').insert(toRow(input));

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateInBodyMeasurement(
  id: string,
  input: SaveInBodyInput
): Promise<SaveInBodyResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('inbody_measurements')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteInBodyMeasurement(id: string): Promise<SaveInBodyResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('inbody_measurements').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
