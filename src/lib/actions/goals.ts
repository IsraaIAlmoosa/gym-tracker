'use server';

import { createClient } from '@/lib/supabase/server';
import type { GoalStatus, GoalType } from '@/lib/goals';

type CreateGoalInput = {
  goalType: GoalType;
  title: string;
  exerciseId: string | null;
  startValue: number;
  targetValue: number;
  manualCurrentValue: number | null;
  unit: string;
  startDate: string;
  targetDate: string | null;
};

type UpdateGoalInput = {
  title: string;
  targetValue: number;
  manualCurrentValue: number | null;
  targetDate: string | null;
};

type GoalActionResult = { success: true } | { success: false; error: string };

export async function createGoal(input: CreateGoalInput): Promise<GoalActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('goals').insert({
    goal_type: input.goalType,
    title: input.title,
    exercise_id: input.exerciseId,
    start_value: input.startValue,
    target_value: input.targetValue,
    manual_current_value: input.manualCurrentValue,
    unit: input.unit,
    start_date: input.startDate,
    target_date: input.targetDate,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<GoalActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('goals')
    .update({
      title: input.title,
      target_value: input.targetValue,
      manual_current_value: input.manualCurrentValue,
      target_date: input.targetDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function setGoalStatus(id: string, status: GoalStatus): Promise<GoalActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase
    .from('goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteGoal(id: string): Promise<GoalActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'not_authenticated' };
  }

  const { error } = await supabase.from('goals').delete().eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
