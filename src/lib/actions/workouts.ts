'use server';

import { createClient } from '@/lib/supabase/server';
import { advanceEnrollment } from '@/lib/programs';
import { toLocalDateStr } from '@/lib/analytics';

type SetInput = {
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
};

type SaveWorkoutInput = {
  sets: SetInput[];
  durationMinutes: number;
  programEnrollmentId?: string;
  programDayId?: string;
};

type SaveWorkoutResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

/** After logging a session tied to an active program, moves the enrollment to the next day/week (or completes it). */
async function advanceProgramEnrollment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  enrollmentId: string
) {
  const { data: enrollment } = await supabase
    .from('program_enrollments')
    .select('current_week, current_day_index, programs(days_per_week, duration_weeks)')
    .eq('id', enrollmentId)
    .single();

  if (!enrollment) return;

  const program = Array.isArray(enrollment.programs) ? enrollment.programs[0] : enrollment.programs;
  if (!program) return;

  const next = advanceEnrollment(
    { currentWeek: enrollment.current_week, currentDayIndex: enrollment.current_day_index },
    { daysPerWeek: program.days_per_week, durationWeeks: program.duration_weeks }
  );

  await supabase
    .from('program_enrollments')
    .update({
      current_week: next.currentWeek,
      current_day_index: next.currentDayIndex,
      status: next.status,
      ...(next.status === 'completed' ? { completed_at: toLocalDateStr(new Date()) } : {}),
    })
    .eq('id', enrollmentId);
}

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
    .insert({
      duration: input.durationMinutes,
      ...(input.programEnrollmentId
        ? { program_enrollment_id: input.programEnrollmentId, program_day_id: input.programDayId }
        : {}),
    })
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

  if (input.programEnrollmentId) {
    await advanceProgramEnrollment(supabase, input.programEnrollmentId);
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
