'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResult = { success: true } | { success: false; error: string };

export async function saveRoutineFromSession(input: {
  name: string;
  exerciseIds: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  if (input.exerciseIds.length === 0) {
    return { success: false, error: 'no_exercises' };
  }

  const { data: routine, error: routineError } = await supabase
    .from('routines')
    .insert({ name: input.name })
    .select('id')
    .single();

  if (routineError || !routine) {
    return { success: false, error: routineError?.message ?? 'routine_insert_failed' };
  }

  const rows = input.exerciseIds.map((exerciseId, index) => ({
    routine_id: routine.id,
    exercise_id: exerciseId,
    order_index: index,
  }));

  const { error: exercisesError } = await supabase.from('routine_exercises').insert(rows);

  if (exercisesError) {
    return { success: false, error: exercisesError.message };
  }

  return { success: true };
}

export async function renameRoutine(routineId: string, name: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('routines').update({ name }).eq('id', routineId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteRoutine(routineId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('routines').delete().eq('id', routineId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateRoutineExercises(
  routineId: string,
  exerciseIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  if (exerciseIds.length === 0) {
    return { success: false, error: 'no_exercises' };
  }

  const { error: deleteError } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const rows = exerciseIds.map((exerciseId, index) => ({
    routine_id: routineId,
    exercise_id: exerciseId,
    order_index: index,
  }));

  const { error: insertError } = await supabase.from('routine_exercises').insert(rows);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}
