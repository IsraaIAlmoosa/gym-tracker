export type ProgramCategory = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split' | 'beginner' | 'custom';

export type ProgramEnrollmentStatus = 'active' | 'completed' | 'abandoned';

export type Program = {
  id: string;
  isDefault: boolean;
  createdByUserId: string | null;
  slug: string | null;
  category: ProgramCategory;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  description: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  durationWeeks: number;
  daysPerWeek: number;
};

export type ProgramRow = {
  id: string;
  is_default: boolean;
  created_by_user_id: string | null;
  slug: string | null;
  category: ProgramCategory;
  name: string;
  name_ar: string | null;
  name_en: string | null;
  description: string | null;
  description_ar: string | null;
  description_en: string | null;
  duration_weeks: number;
  days_per_week: number;
};

export function mapProgramRow(row: ProgramRow): Program {
  return {
    id: row.id,
    isDefault: row.is_default,
    createdByUserId: row.created_by_user_id,
    slug: row.slug,
    category: row.category,
    name: row.name,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    description: row.description,
    descriptionAr: row.description_ar,
    descriptionEn: row.description_en,
    durationWeeks: row.duration_weeks,
    daysPerWeek: row.days_per_week,
  };
}

/**
 * Default programs ship bilingual name_ar/name_en; custom programs only
 * ever have the single free-text `name` the user typed. Same fallback
 * logic applies to descriptions.
 */
export function resolveProgramName(
  program: Pick<Program, 'isDefault' | 'nameAr' | 'nameEn' | 'name'>,
  isArabic: boolean
): string {
  if (program.isDefault && program.nameAr && program.nameEn) {
    return isArabic ? program.nameAr : program.nameEn;
  }
  return program.name;
}

export function resolveProgramDescription(
  program: Pick<Program, 'isDefault' | 'descriptionAr' | 'descriptionEn' | 'description'>,
  isArabic: boolean
): string | null {
  if (program.isDefault && program.descriptionAr && program.descriptionEn) {
    return isArabic ? program.descriptionAr : program.descriptionEn;
  }
  return program.description;
}

export type ProgramDay = {
  id: string;
  programId: string;
  dayIndex: number;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
};

export type ProgramDayRow = {
  id: string;
  program_id: string;
  day_index: number;
  name: string;
  name_ar: string | null;
  name_en: string | null;
};

export function mapProgramDayRow(row: ProgramDayRow): ProgramDay {
  return {
    id: row.id,
    programId: row.program_id,
    dayIndex: row.day_index,
    name: row.name,
    nameAr: row.name_ar,
    nameEn: row.name_en,
  };
}

export function resolveProgramDayName(
  day: Pick<ProgramDay, 'nameAr' | 'nameEn' | 'name'>,
  isArabic: boolean,
  isDefault: boolean
): string {
  if (isDefault && day.nameAr && day.nameEn) {
    return isArabic ? day.nameAr : day.nameEn;
  }
  return day.name;
}

export type ProgramExercise = {
  id: string;
  programDayId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: string | null;
};

export type ProgramExerciseRow = {
  id: string;
  program_day_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: string | null;
};

export function mapProgramExerciseRow(row: ProgramExerciseRow): ProgramExercise {
  return {
    id: row.id,
    programDayId: row.program_day_id,
    exerciseId: row.exercise_id,
    orderIndex: row.order_index,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
  };
}

export type ProgramEnrollment = {
  id: string;
  userId: string;
  programId: string;
  status: ProgramEnrollmentStatus;
  currentWeek: number;
  currentDayIndex: number;
  startedAt: string;
  completedAt: string | null;
};

export type ProgramEnrollmentRow = {
  id: string;
  user_id: string;
  program_id: string;
  status: ProgramEnrollmentStatus;
  current_week: number;
  current_day_index: number;
  started_at: string;
  completed_at: string | null;
};

export function mapProgramEnrollmentRow(row: ProgramEnrollmentRow): ProgramEnrollment {
  return {
    id: row.id,
    userId: row.user_id,
    programId: row.program_id,
    status: row.status,
    currentWeek: row.current_week,
    currentDayIndex: row.current_day_index,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

/**
 * Advances an enrollment by one completed day. Wraps the day index at
 * daysPerWeek (rolling into the next week); once currentWeek would exceed
 * durationWeeks, the enrollment is done — week/day stay put (showing where
 * the user finished) and status flips to 'completed'.
 */
export function advanceEnrollment(
  current: { currentWeek: number; currentDayIndex: number },
  program: { daysPerWeek: number; durationWeeks: number }
): { currentWeek: number; currentDayIndex: number; status: 'active' | 'completed' } {
  const nextDayIndex = current.currentDayIndex + 1;
  if (nextDayIndex <= program.daysPerWeek) {
    return { currentWeek: current.currentWeek, currentDayIndex: nextDayIndex, status: 'active' };
  }
  const nextWeek = current.currentWeek + 1;
  if (nextWeek > program.durationWeeks) {
    return { currentWeek: current.currentWeek, currentDayIndex: current.currentDayIndex, status: 'completed' };
  }
  return { currentWeek: nextWeek, currentDayIndex: 1, status: 'active' };
}
