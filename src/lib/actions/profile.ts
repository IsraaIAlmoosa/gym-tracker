'use server';

import { createClient } from '@/lib/supabase/server';

type SaveProfileInfoInput = {
  gender: 'male' | 'female';
  age: number | null;
  preferredWeightUnit: 'kg' | 'lb';
};

type SaveProfileInfoResult = { success: true } | { success: false; error: string };

export async function saveProfileInfo(
  input: SaveProfileInfoInput
): Promise<SaveProfileInfoResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      gender: input.gender,
      age: input.age,
      preferred_weight_unit: input.preferredWeightUnit,
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
