'use server';

import { createClient } from '@/lib/supabase/server';

type SetInput = {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
};

type SaveWorkoutInput = {
  sets: SetInput[];
  durationMinutes: number;
};

type SaveWorkoutResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

export async function saveWorkout(
  input: SaveWorkoutInput
): Promise<SaveWorkoutResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  if (input.sets.length === 0) {
    return { success: false, error: 'no_sets' };
  }

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({ duration: input.durationMinutes })
    .select('id')
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: sessionError?.message ?? 'session_insert_failed',
    };
  }

  const rows = input.sets.map((s) => ({
    session_id: session.id,
    exercise_id: s.exerciseId,
    set_number: s.setNumber,
    weight: s.weight,
    reps: s.reps,
  }));

  const { error: setsError } = await supabase.from('workout_sets').insert(rows);

  if (setsError) {
    return { success: false, error: setsError.message };
  }

  return { success: true, sessionId: session.id as string };
}

export async function updateWorkoutSession(
  sessionId: string,
  input: SaveWorkoutInput
): Promise<SaveWorkoutResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  if (input.sets.length === 0) {
    return { success: false, error: 'no_sets' };
  }

  const { error: updateError } = await supabase
    .from('workout_sessions')
    .update({ duration: input.durationMinutes })
    .eq('id', sessionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: deleteError } = await supabase
    .from('workout_sets')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const rows = input.sets.map((s) => ({
    session_id: sessionId,
    exercise_id: s.exerciseId,
    set_number: s.setNumber,
    weight: s.weight,
    reps: s.reps,
  }));

  const { error: insertError } = await supabase.from('workout_sets').insert(rows);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, sessionId };
}

type DeleteWorkoutSessionResult = { success: true } | { success: false; error: string };

export async function deleteWorkoutSession(id: string): Promise<DeleteWorkoutSessionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
