'use server';

import { createClient } from '@/lib/supabase/server';

type SaveMeasurementInput = {
  measurementDate: string; // YYYY-MM-DD
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  hipCm: number | null;
  notes: string | null;
};

type SaveMeasurementResult = { success: true } | { success: false; error: string };

export async function saveMeasurement(
  input: SaveMeasurementInput
): Promise<SaveMeasurementResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('body_measurements').insert({
    measurement_date: input.measurementDate,
    weight_kg: input.weightKg,
    waist_cm: input.waistCm,
    chest_cm: input.chestCm,
    arm_cm: input.armCm,
    thigh_cm: input.thighCm,
    hip_cm: input.hipCm,
    notes: input.notes,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
