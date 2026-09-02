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
import { TrophyIcon } from '@/components/ui/icons';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { computeMetricDelta, mapInBodyRow, type InBodyRow } from '@/lib/inbody';
import {
  toLocalDateStr,
  getGreetingPeriod,
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
  ] = await Promise.all([
    supabase.from('profiles').select('gender, preferred_weight_unit').eq('id', user.id).maybeSingle(),
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
  ]);

  if (profileError || sessionsError || allSetsError || recentDatesError || measurementsError || inbodyError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const gender = (profileRow?.gender ?? null) as 'male' | 'female' | null;
  const genderKey = gender === 'female' ? 'female' : 'male';
  const weightUnit = (profileRow?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const displayName = user.email?.split('@')[0] ?? t('defaultName', { gender: genderKey });

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

  const measurements = measurementRows ?? [];
  const latestWeight = measurements[0]?.weight_kg ?? null;
  const previousWeight = measurements[1]?.weight_kg ?? null;

  const inbodyMeasurements = ((inbodyRows ?? []) as unknown as InBodyRow[]).map(mapInBodyRow);
  const latestInBody = inbodyMeasurements[0] ?? null;
  const previousInBody = inbodyMeasurements[1] ?? null;

  const rawBodyFatDelta = latestInBody
    ? computeMetricDelta(latestInBody, previousInBody, 'bodyFatPercentage')
    : null;
  const bodyFatDelta = rawBodyFatDelta ? { ...rawBodyFatDelta, text: `${rawBodyFatDelta.text}%` } : null;

  const rawMuscleMassDelta = latestInBody
    ? computeMetricDelta(latestInBody, previousInBody, 'skeletalMuscleMassKg', (kg) => kgToDisplayUnit(kg, weightUnit))
    : null;
  const muscleMassDelta = rawMuscleMassDelta
    ? { ...rawMuscleMassDelta, text: `${rawMuscleMassDelta.text} ${weightUnit}` }
    : null;

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

  const greetingPeriod = getGreetingPeriod(now);

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <section className="mb-6">
        <h1 className="m-0 mb-1 text-2xl font-bold text-text lg:text-3xl">
          {t(`greeting.${greetingPeriod}`, { name: displayName })}
        </h1>
        <p className="m-0 text-[15px] text-text-muted">{t('subtitle', { gender: genderKey })}</p>
      </section>

      <div className="mb-6 flex flex-wrap gap-3">
        <Button href="/workouts/new">{t('startWorkout')}</Button>
        <Button href="/activities/new" variant="secondary">
          {t('logActivity')}
        </Button>
        <Button href="/goals" variant="ghost">
          {t('goalsLink')}
        </Button>
      </div>

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
            <EmptyState compact message={t('noInBodyData')} ctaLabel={t('addMeasurement')} ctaHref="/measurements" />
          </Card>
        )}

        <MetricCard
          label={t('streakLabel')}
          value={currentStreak}
          unit={t('daysUnit', { n: currentStreak })}
        />

        {latestInBody?.bodyFatPercentage !== null && latestInBody?.bodyFatPercentage !== undefined ? (
          <MetricCard
            label={t('bodyFatLabel')}
            value={latestInBody.bodyFatPercentage.toFixed(1)}
            unit="%"
            delta={bodyFatDelta ?? undefined}
          />
        ) : (
          <Card>
            <EmptyState compact message={t('noInBodyBodyFat')} ctaLabel={t('addMeasurement')} ctaHref="/inbody/new" />
          </Card>
        )}

        {latestInBody?.skeletalMuscleMassKg !== null && latestInBody?.skeletalMuscleMassKg !== undefined ? (
          <MetricCard
            label={t('muscleMassLabel')}
            value={kgToDisplayUnit(latestInBody.skeletalMuscleMassKg, weightUnit)}
            unit={weightUnit}
            delta={muscleMassDelta ?? undefined}
          />
        ) : (
          <Card>
            <EmptyState compact message={t('noInBodyMuscleMass')} ctaLabel={t('addMeasurement')} ctaHref="/inbody/new" />
          </Card>
        )}
      </div>

      <Card
        className="mb-6"
        title={t('streakTitle')}
        action={<span className="text-xs text-text-faint">{t('streakCount', { n: trainedCountLast28, days: DAYS_BACK })}</span>}
      >
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {streakDays.map((day) => (
            <div
              key={day.dateStr}
              title={formatDate(day.dateStr)}
              className={`h-3.5 w-3.5 shrink-0 rounded ${day.trained ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={t('strengthProgressTitle')}
          action={
            <Link href="/progress" className="text-xs text-accent no-underline">
              {t('viewProgress')}
            </Link>
          }
        >
          {exerciseTrends.length === 0 ? (
            <EmptyState compact message={t('strengthProgressEmpty')} />
          ) : (
            <StrengthTrendChart trends={exerciseTrends} weightUnit={weightUnit} />
          )}
        </Card>

        <Card title={t('personalRecordsTitle')}>
          {personalRecords.length === 0 ? (
            <EmptyState compact message={t('personalRecordsEmpty')} />
          ) : (
            <div className="flex flex-col gap-3">
              {personalRecords.map((pr) => (
                <div key={pr.exerciseId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrophyIcon color="#FFD700" size={18} />
                    <span className="text-sm text-text">{pr.exerciseName}</span>
                  </div>
                  <span className="text-sm font-bold text-gold">
                    {kgToDisplayUnit(pr.weight, weightUnit)} {weightUnit} × {pr.reps}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={t('recentSessions')}
          action={
            <Link href="/history" className="text-xs text-accent no-underline">
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

        <Card title={t('insights')}>
          {insights.length === 0 ? (
            <EmptyState compact message={t('insightsPlaceholder')} />
          ) : (
            <div className="flex flex-col gap-3">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge tone={insightTone(insight)}>{t(`insightType.${insight.type}`)}</Badge>
                  <p className="m-0 text-[13px] leading-relaxed text-text-muted">{insightMessage(insight)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
