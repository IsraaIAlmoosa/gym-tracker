import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import StrengthTrendChart from '@/components/StrengthTrendChart';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MetricCard from '@/components/ui/MetricCard';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { TrophyIcon, LightbulbIcon, ClipboardIcon, ScaleIcon, ProgressIcon } from '@/components/ui/icons';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { resolveDisplayName } from '@/lib/profile';
import { mapInBodyRow, type InBodyRow } from '@/lib/inbody';
import {
  mapProgramRow,
  resolveProgramName,
  resolveProgramDayName,
  type ProgramRow,
} from '@/lib/programs';
import {
  toLocalDateStr,
  calculateStreakDays,
  calculateConsecutiveStreak,
  detectInsights,
  detectBodyCompositionInsight,
  detectFrequencyInsight,
  computePersonalRecords,
  computeExerciseTrends,
  type WorkoutSetRow,
  type ExerciseInsight,
  type BodyCompositionInsight,
  type FrequencyInsight,
  type StreakDay,
} from '@/lib/analytics';

type DashboardInsight = ExerciseInsight | BodyCompositionInsight | FrequencyInsight;

type Props = {
  params: Promise<{ locale: string }>;
};

type SessionRow = {
  id: string;
  date: string;
  duration: number | null;
  created_at: string;
};

type ExerciseNameRow = { name_ar: string; name_en: string };

type SetRow = {
  session_id: string;
  exercise_id: string;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

type SetWithSessionDate = {
  exercise_id: string;
  weight: number;
  reps: number;
  session_id: string;
  workout_sessions: { date: string } | { date: string }[] | null;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

type EnrollmentRow = {
  id: string;
  program_id: string;
  current_week: number;
  current_day_index: number;
  programs: ProgramRow | ProgramRow[] | null;
};

const DAYS_BACK = 28;

function resolveOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';

  const t = await getTranslations({ locale, namespace: 'dashboard' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);
  const rangeStart = new Date(todayMidnight);
  rangeStart.setDate(rangeStart.getDate() - (DAYS_BACK - 1));
  const rangeStartStr = toLocalDateStr(rangeStart);

  const [
    { data: profileRow, error: profileError },
    { data: sessions, error: sessionsError },
    { data: allSets, error: allSetsError },
    { data: recentDatesRaw, error: recentDatesError },
    { data: measurementRows, error: measurementsError },
    { data: inbodyRows, error: inbodyError },
    { data: enrollmentRows, error: enrollmentError },
    { count: totalWorkoutsCount, error: totalWorkoutsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, gender, preferred_weight_unit')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('workout_sessions')
      .select('id, date, duration, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('workout_sets')
      .select('exercise_id, weight, reps, session_id, workout_sessions(date), exercises(name_ar, name_en)'),
    supabase.from('workout_sessions').select('date').gte('date', rangeStartStr),
    supabase
      .from('body_measurements')
      .select('measurement_date, weight_kg')
      .order('measurement_date', { ascending: false })
      .limit(2),
    supabase
      .from('inbody_measurements')
      .select(
        'id, measurement_date, height_cm, weight_kg, skeletal_muscle_mass_kg, body_fat_percentage, body_fat_mass_kg, bmi, basal_metabolic_rate_kcal, body_water_liters, visceral_fat_level, waist_hip_ratio, protein_mass_kg, mineral_mass_kg, segmental_data, notes'
      )
      .order('measurement_date', { ascending: false })
      .limit(2),
    supabase
      .from('program_enrollments')
      .select(
        'id, program_id, current_week, current_day_index, programs(id, is_default, created_by_user_id, slug, category, name, name_ar, name_en, description, description_ar, description_en, duration_weeks, days_per_week)'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }),
  ]);

  if (
    profileError ||
    sessionsError ||
    allSetsError ||
    recentDatesError ||
    measurementsError ||
    inbodyError ||
    enrollmentError ||
    totalWorkoutsError
  ) {
    return <LoadErrorNotice locale={locale} />;
  }

  const gender = (profileRow?.gender ?? null) as 'male' | 'female' | null;
  const genderKey = gender === 'female' ? 'female' : 'male';
  const weightUnit = (profileRow?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const displayName = resolveDisplayName(
    profileRow?.first_name ?? null,
    profileRow?.last_name ?? null,
    user.email,
    t('defaultName', { gender: genderKey })
  );

  // "Today's workout" is sourced from the user's active program day (the only
  // real "planned for today" concept this app has) — no fake schedule data.
  const enrollmentRaw = ((enrollmentRows ?? []) as unknown as EnrollmentRow[])[0] ?? null;
  const activeProgramInfo = enrollmentRaw ? resolveOne(enrollmentRaw.programs) : null;

  let todaysWorkout: {
    enrollmentId: string;
    programName: string;
    dayName: string;
    exerciseCount: number;
    currentWeek: number;
    durationWeeks: number;
  } | null = null;

  if (enrollmentRaw && activeProgramInfo) {
    const mappedProgram = mapProgramRow(activeProgramInfo);
    const { data: currentDayRaw } = await supabase
      .from('program_days')
      .select('name, name_ar, name_en, program_exercises(id)')
      .eq('program_id', enrollmentRaw.program_id)
      .eq('day_index', enrollmentRaw.current_day_index)
      .maybeSingle();

    todaysWorkout = {
      enrollmentId: enrollmentRaw.id,
      programName: resolveProgramName(mappedProgram, isArabic),
      dayName: currentDayRaw
        ? resolveProgramDayName(
            { name: currentDayRaw.name, nameAr: currentDayRaw.name_ar, nameEn: currentDayRaw.name_en },
            isArabic,
            mappedProgram.isDefault
          )
        : '',
      exerciseCount: currentDayRaw?.program_exercises?.length ?? 0,
      currentWeek: enrollmentRaw.current_week,
      durationWeeks: mappedProgram.durationWeeks,
    };
  }

  const sessionList: SessionRow[] = sessions ?? [];
  const sessionIds = sessionList.map((s) => s.id);

  const setsBySession: Record<string, { count: number; exerciseNames: Set<string> }> = {};
  if (sessionIds.length > 0) {
    const { data: sessionSets } = await supabase
      .from('workout_sets')
      .select('session_id, exercise_id, exercises(name_ar, name_en)')
      .in('session_id', sessionIds);

    for (const row of (sessionSets ?? []) as unknown as SetRow[]) {
      const bucket = setsBySession[row.session_id] ?? { count: 0, exerciseNames: new Set<string>() };
      bucket.count += 1;
      const ex = resolveOne(row.exercises);
      if (ex) bucket.exerciseNames.add(isArabic ? ex.name_ar : ex.name_en);
      setsBySession[row.session_id] = bucket;
    }
  }

  const flatSetRows: WorkoutSetRow[] = ((allSets ?? []) as unknown as SetWithSessionDate[])
    .map((row) => {
      const session = resolveOne(row.workout_sessions);
      const ex = resolveOne(row.exercises);
      if (!session || !ex) return null;
      return {
        sessionId: row.session_id,
        exerciseId: row.exercise_id,
        exerciseName: isArabic ? ex.name_ar : ex.name_en,
        weight: row.weight,
        reps: row.reps,
        date: session.date,
      };
    })
    .filter((r): r is WorkoutSetRow => r !== null);

  const exerciseInsights: ExerciseInsight[] = detectInsights(flatSetRows).slice(0, 3);
  const personalRecords = computePersonalRecords(flatSetRows).slice(0, 5);
  const exerciseTrends = computeExerciseTrends(flatSetRows, 3);

  const trainedDates = new Set((recentDatesRaw ?? []).map((r) => r.date as string));
  const streakDays = calculateStreakDays(trainedDates, DAYS_BACK, todayMidnight);
  const currentStreak = calculateConsecutiveStreak(trainedDates, todayMidnight);
  const trainedCountLast28 = streakDays.filter((d) => d.trained).length;

  // Calendar-style grid: pad the front so columns line up on real weeks
  // (rows = weekday, columns = week), regardless of page reading direction.
  const firstWeekday = streakDays[0]?.date.getDay() ?? 0;
  const heatmapCells: (StreakDay | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...streakDays,
  ];

  const inbodyMeasurements = ((inbodyRows ?? []) as unknown as InBodyRow[]).map(mapInBodyRow);
  const latestInBody = inbodyMeasurements[0] ?? null;
  const previousInBody = inbodyMeasurements[1] ?? null;

  const measurements = measurementRows ?? [];
  // Body-weight can come from either the plain measurements log or an InBody
  // scan — merge both sources by date so the headline number and its delta
  // both reflect whichever is most recent, regardless of which log it's in.
  const weighIns = [
    ...measurements
      .filter((m): m is typeof m & { weight_kg: number } => m.weight_kg !== null)
      .map((m) => ({ date: m.measurement_date, weight: m.weight_kg })),
    ...inbodyMeasurements
      .filter((m): m is typeof m & { weightKg: number } => m.weightKg !== null)
      .map((m) => ({ date: m.measurementDate, weight: m.weightKg })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const latestWeight = weighIns[0]?.weight ?? null;
  const previousWeight = weighIns[1]?.weight ?? null;

  const bodyCompositionInsight = latestInBody ? detectBodyCompositionInsight(latestInBody, previousInBody) : null;
  const frequencyInsight = detectFrequencyInsight(trainedDates, todayMidnight);

  const insights: DashboardInsight[] = [
    ...exerciseInsights,
    ...(bodyCompositionInsight ? [bodyCompositionInsight] : []),
    ...(frequencyInsight ? [frequencyInsight] : []),
  ];

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar' : 'en', { day: 'numeric', month: 'short' });
  }

  function insightTone(insight: DashboardInsight): 'gold' | 'good' | 'warn' | 'neutral' {
    if (insight.type === 'pr') return 'gold';
    if (insight.type === 'progress') return 'good';
    if (insight.type === 'plateau') return 'warn';
    if (insight.type === 'bodyComposition') return insight.positive ? 'good' : 'neutral';
    return insight.direction === 'up' ? 'good' : 'neutral';
  }

  function insightMessage(insight: DashboardInsight): string {
    if (insight.type === 'pr' || insight.type === 'plateau' || insight.type === 'progress') {
      const weight = kgToDisplayUnit(insight.weight, weightUnit);
      if (insight.type === 'pr') return t('insightPr', { name: insight.exerciseName, weight, unit: weightUnit });
      if (insight.type === 'plateau')
        return t('insightPlateau', { name: insight.exerciseName, weight, unit: weightUnit });
      return t('insightProgress', {
        name: insight.exerciseName,
        weight,
        previousWeight: kgToDisplayUnit(insight.previousWeight, weightUnit),
        unit: weightUnit,
      });
    }
    if (insight.type === 'bodyComposition') {
      return t('insightBodyComposition', {
        bodyFatDirection: insight.bodyFatDirection,
        muscleDirection: insight.muscleDirection,
      });
    }
    return t('insightFrequency', {
      direction: insight.direction,
      current: insight.currentCount,
      previous: insight.previousCount,
    });
  }

  const totalWorkouts = totalWorkoutsCount ?? 0;
  const lastWorkout = sessionList[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      {/* Hero */}
      <section className="mb-7">
        <h1 className="m-0 mb-1.5 text-[26px] font-bold tracking-tight text-text lg:text-3xl">
          {t('greeting', { name: displayName })}
        </h1>
        <p className="m-0 text-[15px] text-text-muted">{t('subtitle', { gender: genderKey })}</p>
      </section>

      {/* Today's Workout */}
      <Card className={`mb-6 ${todaysWorkout ? 'border-accent/25' : ''}`}>
        {todaysWorkout ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                {t('todayWorkoutTitle')}
              </span>
              <Badge tone="neutral">
                {t('activeProgramWeek', { current: todaysWorkout.currentWeek, total: todaysWorkout.durationWeeks })}
              </Badge>
            </div>
            <p className="m-0 mb-1 text-xl font-bold text-text lg:text-2xl">
              {todaysWorkout.dayName || todaysWorkout.programName}
            </p>
            <p className="m-0 mb-5 text-sm text-text-muted">
              {todaysWorkout.programName}
              {' · '}
              {t('exerciseCount', { n: todaysWorkout.exerciseCount })}
            </p>
            <Button href={`/workouts/new?program=${todaysWorkout.enrollmentId}`} className="w-full sm:w-auto">
              {t('startTodayWorkout')}
            </Button>
          </>
        ) : (
          <>
            <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-text-faint">
              {t('todayWorkoutTitle')}
            </span>
            <EmptyState
              icon={<ClipboardIcon color="#737373" size={28} />}
              message={t('noWorkoutPlanned')}
              ctaLabel={t('createWorkout')}
              ctaHref="/workouts/new"
            />
          </>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {latestWeight !== null ? (
          <MetricCard
            label={t('weightLabel')}
            value={kgToDisplayUnit(latestWeight, weightUnit)}
            unit={weightUnit}
            delta={
              previousWeight !== null
                ? {
                    text: `${Math.abs(kgToDisplayUnit(latestWeight - previousWeight, weightUnit)).toFixed(1)} ${weightUnit}`,
                    direction: latestWeight === previousWeight ? 'flat' : latestWeight < previousWeight ? 'down' : 'up',
                  }
                : undefined
            }
          />
        ) : (
          <Card>
            <EmptyState compact message={t('noWeightData')} ctaLabel={t('addMeasurement')} ctaHref="/measurements" />
          </Card>
        )}

        <MetricCard label={t('streakLabel')} value={currentStreak} unit={t('daysUnit', { n: currentStreak })} />

        <MetricCard label={t('totalWorkoutsLabel')} value={totalWorkouts} />

        <MetricCard
          label={t('lastWorkoutLabel')}
          value={lastWorkout ? formatDate(lastWorkout.date) : '—'}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button href="/workouts/new" className="px-4 py-2.5 text-xs">
          {t('startWorkout')}
        </Button>
        <Button href="/measurements" variant="secondary" className="flex items-center gap-1.5 px-4 py-2.5 text-xs">
          <ScaleIcon color="#C4F82A" size={16} />
          {t('addMeasurement')}
        </Button>
        <Button href="/progress" variant="secondary" className="flex items-center gap-1.5 px-4 py-2.5 text-xs">
          <ProgressIcon color="#C4F82A" size={16} />
          {t('viewProgressCta')}
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Button href="/activities/new" variant="ghost" className="px-3 py-2 text-xs">
          {t('logActivity')}
        </Button>
        <Button href="/goals" variant="ghost" className="px-3 py-2 text-xs">
          {t('goalsLink')}
        </Button>
        <Button href="/exercises" variant="ghost" className="px-3 py-2 text-xs">
          {t('exercisesLink')}
        </Button>
        <Button href="/programs" variant="ghost" className="px-3 py-2 text-xs">
          {t('programsLink')}
        </Button>
      </div>

      {/* Strength Progress */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={t('strengthProgressTitle')}
          action={
            <Link href="/progress" className="text-xs text-accent no-underline hover:underline">
              {t('viewProgress')}
            </Link>
          }
        >
          {exerciseTrends.length === 0 ? (
            <EmptyState compact message={t('strengthProgressEmpty')} />
          ) : (
            <StrengthTrendChart
              trends={exerciseTrends}
              weightUnit={weightUnit}
              noDataInRangeLabel={t('strengthNoDataInRange')}
            />
          )}
        </Card>

        {/* Activity heatmap */}
        <Card
          title={t('streakTitle')}
          action={<span className="text-xs text-text-faint">{t('streakCount', { n: trainedCountLast28, days: DAYS_BACK })}</span>}
        >
          <div dir="ltr" className="overflow-x-auto py-0.5">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
              {heatmapCells.map((day, i) =>
                day ? (
                  <div
                    key={day.dateStr}
                    title={`${formatDate(day.dateStr)}${day.trained ? ` · ${t('trainedLabel')}` : ''}`}
                    className={`h-3.5 w-3.5 rounded-[4px] transition-transform hover:scale-110 ${
                      day.trained ? 'bg-accent' : 'bg-border'
                    }`}
                  />
                ) : (
                  <div key={`pad-${i}`} className="h-3.5 w-3.5" />
                )
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-text-faint">
            <span className="h-2.5 w-2.5 rounded-sm bg-border" />
            {t('legendRest')}
            <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
            {t('legendTrained')}
          </div>
        </Card>
      </div>

      {/* Personal Records */}
      <Card className="mb-6" title={t('personalRecordsTitle')}>
        {personalRecords.length === 0 ? (
          <EmptyState compact message={t('personalRecordsEmpty')} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {personalRecords.map((pr, i) => (
              <div
                key={pr.exerciseId}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:border-gold/40 ${
                  i === 0 ? 'border-gold/25 bg-gold/[0.06]' : 'border-border bg-surface-raised'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrophyIcon color="#FFD700" size={18} />
                  <span className="text-sm text-text">{pr.exerciseName}</span>
                </div>
                <span className="text-base font-bold text-gold">
                  {kgToDisplayUnit(pr.weight, weightUnit)} {weightUnit}
                  <span className="ms-1 text-xs font-normal text-text-faint">× {pr.reps}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Smart Insights */}
      <Card className="mb-6" title={t('insights')}>
        {insights.length === 0 ? (
          <EmptyState compact message={t('insightsPlaceholder')} />
        ) : (
          <div className="flex flex-col gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border-s-2 border-accent/50 bg-surface-raised/60 p-3 transition-colors hover:bg-surface-raised"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
                  <LightbulbIcon color="#C4F82A" size={15} />
                </div>
                <div>
                  <Badge tone={insightTone(insight)}>{t(`insightType.${insight.type}`)}</Badge>
                  <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-text-muted">{insightMessage(insight)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Sessions */}
      <Card
        title={t('recentSessions')}
        action={
          <Link href="/history" className="text-xs text-accent no-underline hover:underline">
            {t('viewFullHistory')}
          </Link>
        }
      >
        {sessionList.length === 0 ? (
          <EmptyState compact message={t('noSessions')} ctaLabel={t('startWorkout')} ctaHref="/workouts/new" />
        ) : (
          <div className="flex flex-col gap-3">
            {sessionList.map((s) => {
              const bucket = setsBySession[s.id];
              const exerciseNames = bucket ? Array.from(bucket.exerciseNames) : [];
              return (
                <div key={s.id} className="border-b border-border pb-2.5 last:border-0 last:pb-0">
                  <div className="flex justify-between text-[13px] text-text-muted">
                    <span>{formatDate(s.date)}</span>
                    <span>
                      {bucket?.count ?? 0} {t('setsLabel')}
                      {s.duration ? ` · ${s.duration} ${t('minutesLabel')}` : ''}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-sm text-text">
                    {exerciseNames.length > 0 ? exerciseNames.join(isArabic ? '، ' : ', ') : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
