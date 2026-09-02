export type GoalType = 'weight' | 'body_fat_percentage' | 'exercise_max_weight' | 'workout_frequency' | 'custom';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export type Goal = {
  id: string;
  goalType: GoalType;
  title: string;
  exerciseId: string | null;
  startValue: number;
  targetValue: number;
  manualCurrentValue: number | null;
  unit: string;
  startDate: string;
  targetDate: string | null;
  status: GoalStatus;
};

export type GoalRow = {
  id: string;
  goal_type: GoalType;
  title: string;
  exercise_id: string | null;
  start_value: number;
  target_value: number;
  manual_current_value: number | null;
  unit: string;
  start_date: string;
  target_date: string | null;
  status: GoalStatus;
};

export function mapGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    goalType: row.goal_type,
    title: row.title,
    exerciseId: row.exercise_id,
    startValue: row.start_value,
    targetValue: row.target_value,
    manualCurrentValue: row.manual_current_value,
    unit: row.unit,
    startDate: row.start_date,
    targetDate: row.target_date,
    status: row.status,
  };
}

/**
 * Progress percentage, 0-100. Direction-agnostic: works for both "increase"
 * goals (muscle gain, strength — target > start) and "decrease" goals
 * (weight/fat loss — target < start) because (target - start) carries the sign.
 */
export function calculateGoalProgress(start: number, current: number, target: number): number {
  if (target === start) return current === target ? 100 : 0;
  const pct = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export type GoalCurrentValueContext = {
  latestWeightKg: number | null;
  latestBodyFatPercentage: number | null;
  exerciseMaxWeightKg: Record<string, number>;
  sessionsLast7Days: number;
};

/** Resolves a goal's "current" value from real, already-fetched data — never stored/duplicated. */
export function resolveGoalCurrentValue(
  goal: Pick<Goal, 'goalType' | 'exerciseId' | 'manualCurrentValue'>,
  context: GoalCurrentValueContext
): number | null {
  switch (goal.goalType) {
    case 'weight':
      return context.latestWeightKg;
    case 'body_fat_percentage':
      return context.latestBodyFatPercentage;
    case 'exercise_max_weight':
      return goal.exerciseId ? (context.exerciseMaxWeightKg[goal.exerciseId] ?? null) : null;
    case 'workout_frequency':
      return context.sessionsLast7Days;
    case 'custom':
      return goal.manualCurrentValue;
  }
}
