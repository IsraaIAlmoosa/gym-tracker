export function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function getGreetingPeriod(date: Date): GreetingPeriod {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export type StreakDay = { date: Date; dateStr: string; trained: boolean };

/** Builds the last `daysBack` days (inclusive of `today`), flagging which were trained. */
export function calculateStreakDays(
  trainedDates: Set<string>,
  daysBack: number,
  today: Date
): StreakDay[] {
  const days: StreakDay[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    days.push({ date: d, dateStr, trained: trainedDates.has(dateStr) });
  }
  return days;
}

/** Current consecutive-day streak. Today doesn't break the streak until the day ends. */
export function calculateConsecutiveStreak(trainedDates: Set<string>, today: Date): number {
  const cursor = new Date(today);
  if (!trainedDates.has(toLocalDateStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (trainedDates.has(toLocalDateStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type WorkoutSetRow = {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
};

export type ExerciseInsight =
  | { type: 'pr'; exerciseName: string; weight: number }
  | { type: 'plateau'; exerciseName: string; weight: number }
  | { type: 'progress'; exerciseName: string; weight: number; previousWeight: number };

/** Detects PR / plateau / progress per exercise by comparing the latest session's best set to prior sessions. */
export function detectInsights(rows: WorkoutSetRow[]): ExerciseInsight[] {
  type SessionBest = { date: string; maxWeight: number; reps: number };
  const byExercise = new Map<string, { name: string; sessions: Map<string, SessionBest> }>();

  for (const row of rows) {
    let bucket = byExercise.get(row.exerciseId);
    if (!bucket) {
      bucket = { name: row.exerciseName, sessions: new Map() };
      byExercise.set(row.exerciseId, bucket);
    }
    const existing = bucket.sessions.get(row.sessionId);
    if (!existing || row.weight > existing.maxWeight) {
      bucket.sessions.set(row.sessionId, { date: row.date, maxWeight: row.weight, reps: row.reps });
    }
  }

  const insights: ExerciseInsight[] = [];

  for (const { name, sessions } of byExercise.values()) {
    const sorted = Array.from(sessions.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (sorted.length < 2) continue;
    const [latest, ...history] = sorted;
    const previousBest = Math.max(...history.map((h) => h.maxWeight));
    const previousSession = history[0];

    if (latest.maxWeight > previousBest) {
      insights.push({ type: 'pr', exerciseName: name, weight: latest.maxWeight });
    } else if (latest.maxWeight === previousSession.maxWeight && latest.reps <= previousSession.reps) {
      insights.push({ type: 'plateau', exerciseName: name, weight: latest.maxWeight });
    } else if (latest.maxWeight > previousSession.maxWeight) {
      insights.push({
        type: 'progress',
        exerciseName: name,
        weight: latest.maxWeight,
        previousWeight: previousSession.maxWeight,
      });
    }
  }

  const order: Record<ExerciseInsight['type'], number> = { pr: 0, plateau: 1, progress: 2 };
  return insights.sort((a, b) => order[a.type] - order[b.type]);
}

export type PersonalRecord = { exerciseId: string; exerciseName: string; weight: number; reps: number };

/** Best-ever set (max weight, ties broken by reps) per exercise, sorted heaviest first. */
export function computePersonalRecords(rows: WorkoutSetRow[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const row of rows) {
    const current = best.get(row.exerciseId);
    if (!current || row.weight > current.weight || (row.weight === current.weight && row.reps > current.reps)) {
      best.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        weight: row.weight,
        reps: row.reps,
      });
    }
  }
  return Array.from(best.values()).sort((a, b) => b.weight - a.weight);
}

export type ExerciseTrend = {
  exerciseId: string;
  exerciseName: string;
  points: { date: string; weight: number }[];
};

/**
 * Per-session best weight over time for the most-logged exercises.
 * Exercises with fewer than 2 sessions are excluded — a single point isn't a trend.
 */
export function computeExerciseTrends(rows: WorkoutSetRow[], topN = 3): ExerciseTrend[] {
  const byExercise = new Map<string, { name: string; sessions: Map<string, { date: string; maxWeight: number }> }>();

  for (const row of rows) {
    let bucket = byExercise.get(row.exerciseId);
    if (!bucket) {
      bucket = { name: row.exerciseName, sessions: new Map() };
      byExercise.set(row.exerciseId, bucket);
    }
    const existing = bucket.sessions.get(row.sessionId);
    if (!existing || row.weight > existing.maxWeight) {
      bucket.sessions.set(row.sessionId, { date: row.date, maxWeight: row.weight });
    }
  }

  return Array.from(byExercise.entries())
    .map(([exerciseId, { name, sessions }]) => ({
      exerciseId,
      exerciseName: name,
      points: Array.from(sessions.values())
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((s) => ({ date: s.date, weight: s.maxWeight })),
    }))
    .filter((trend) => trend.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, topN);
}
