'use server';

import { createClient } from '@/lib/supabase/server';

type ActionResult = { success: true } | { success: false; error: string };

type StartProgramResult = { success: true; enrollmentId: string } | { success: false; error: string };

/** Abandons any existing active enrollment (a user only ever has one active program) and starts the new one. */
export async function startProgram(programId: string): Promise<StartProgramResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error: abandonError } = await supabase
    .from('program_enrollments')
    .update({ status: 'abandoned' })
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (abandonError) {
    return { success: false, error: abandonError.message };
  }

  const { data: enrollment, error: insertError } = await supabase
    .from('program_enrollments')
    .insert({ program_id: programId })
    .select('id')
    .single();

  if (insertError || !enrollment) {
    return { success: false, error: insertError?.message ?? 'enrollment_insert_failed' };
  }

  return { success: true, enrollmentId: enrollment.id as string };
}

export async function abandonProgram(enrollmentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('program_enrollments')
    .update({ status: 'abandoned' })
    .eq('id', enrollmentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function createCustomProgram(input: {
  name: string;
  durationWeeks: number;
  days: { name: string; exerciseIds: string[] }[];
}): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const days = input.days.filter((d) => d.exerciseIds.length > 0);
  if (days.length === 0) {
    return { success: false, error: 'no_days' };
  }

  const { data: program, error: programError } = await supabase
    .from('programs')
    .insert({
      created_by_user_id: user.id,
      category: 'custom',
      name: input.name,
      duration_weeks: input.durationWeeks,
      days_per_week: days.length,
    })
    .select('id')
    .single();

  if (programError || !program) {
    return { success: false, error: programError?.message ?? 'program_insert_failed' };
  }

  const dayRows = days.map((d, index) => ({
    program_id: program.id,
    day_index: index + 1,
    name: d.name,
  }));

  const { data: insertedDays, error: daysError } = await supabase
    .from('program_days')
    .insert(dayRows)
    .select('id, day_index');

  if (daysError || !insertedDays) {
    return { success: false, error: daysError?.message ?? 'days_insert_failed' };
  }

  const exerciseRows = insertedDays.flatMap((row) => {
    const day = days[row.day_index - 1];
    return day.exerciseIds.map((exerciseId, order) => ({
      program_day_id: row.id,
      exercise_id: exerciseId,
      order_index: order,
    }));
  });

  const { error: exercisesError } = await supabase.from('program_exercises').insert(exerciseRows);

  if (exercisesError) {
    return { success: false, error: exercisesError.message };
  }

  return { success: true };
}

export async function updateProgramDayExercises(
  programDayId: string,
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
    .from('program_exercises')
    .delete()
    .eq('program_day_id', programDayId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  const rows = exerciseIds.map((exerciseId, index) => ({
    program_day_id: programDayId,
    exercise_id: exerciseId,
    order_index: index,
  }));

  const { error: insertError } = await supabase.from('program_exercises').insert(rows);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function deleteProgram(programId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('programs').delete().eq('id', programId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
