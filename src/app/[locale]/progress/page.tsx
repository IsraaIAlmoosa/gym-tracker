import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import Card from '@/components/ui/Card';
import MetricCard from '@/components/ui/MetricCard';
import EmptyState from '@/components/ui/EmptyState';
import { TrophyIcon } from '@/components/ui/icons';
import StrengthTrendChart from '@/components/StrengthTrendChart';
import InBodyCharts from '@/components/InBodyCharts';
import { mapInBodyRow, type InBodyRow } from '@/lib/inbody';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import {
  toLocalDateStr,
  calculateTotalVolume,
  calculateWorkoutFrequency,
  computePersonalRecords,
  computeExerciseTrends,
  type WorkoutSetRow,
} from '@/lib/analytics';

type Props = {
  params: Promise<{ locale: string }>;
};

type ExerciseNameRow = { name_ar: string; name_en: string };

type SetWithSessionDate = {
  exercise_id: string;
  weight: number;
  reps: number;
  session_id: string;
  workout_sessions: { date: string } | { date: string }[] | null;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

const VOLUME_WINDOW_DAYS = 90;

function resolveOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ProgressPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'progress' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const windowStartStr = toLocalDateStr(new Date(new Date().getTime() - (VOLUME_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000));

  const [
    { data: profile, error: profileError },
    { data: allSets, error: allSetsError },
    { data: windowSessions, error: sessionsError },
    { data: inbodyRows, error: inbodyError },
  ] = await Promise.all([
    supabase.from('profiles').select('preferred_weight_unit').eq('id', user.id).maybeSingle(),
    supabase
      .from('workout_sets')
      .select('exercise_id, weight, reps, session_id, workout_sessions(date), exercises(name_ar, name_en)'),
    supabase.from('workout_sessions').select('id, duration, date').gte('date', windowStartStr),
    supabase
      .from('inbody_measurements')
      .select(
        'id, measurement_date, height_cm, weight_kg, skeletal_muscle_mass_kg, body_fat_percentage, body_fat_mass_kg, bmi, basal_metabolic_rate_kcal, body_water_liters, visceral_fat_level, waist_hip_ratio, protein_mass_kg, mineral_mass_kg, segmental_data, notes'
      )
      .order('measurement_date', { ascending: false })
      .limit(60),
  ]);

  if (profileError || allSetsError || sessionsError || inbodyError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;

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

  const windowRows = flatSetRows.filter((r) => r.date >= windowStartStr);
  const sessionsInWindow = windowSessions ?? [];

  const totalVolumeKg = calculateTotalVolume(windowRows);
  const totalSets = windowRows.length;
  const totalReps = windowRows.reduce((sum, r) => sum + r.reps, 0);
  const sessionsPerWeek = calculateWorkoutFrequency(
    sessionsInWindow.map((s) => s.date),
    VOLUME_WINDOW_DAYS
  );
  const durations = sessionsInWindow.map((s) => s.duration).filter((d): d is number => d !== null);
  const avgDurationMinutes = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const personalRecords = computePersonalRecords(flatSetRows);
  const exerciseTrends = computeExerciseTrends(flatSetRows, 8);

  const inbodyMeasurements = ((inbodyRows ?? []) as unknown as InBodyRow[]).map(mapInBodyRow);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-6 text-2xl font-bold text-text lg:text-3xl">{t('title')}</h1>

      <div className="flex flex-col gap-6">
        <Card title={t('bodyProgressTitle')}>
          {inbodyMeasurements.length === 0 ? (
            <EmptyState compact message={t('bodyProgressEmpty')} ctaLabel={t('addInBody')} ctaHref="/inbody/new" />
          ) : (
            <InBodyCharts measurements={inbodyMeasurements} weightUnit={weightUnit} />
          )}
        </Card>

        <Card title={t('strengthProgressTitle')}>
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

        <Card title={t('trainingProgressTitle')} action={<span className="text-xs text-text-faint">{t('windowLabel', { n: VOLUME_WINDOW_DAYS })}</span>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label={t('totalVolume')} value={Math.round(kgToDisplayUnit(totalVolumeKg, weightUnit)).toLocaleString()} unit={weightUnit} />
            <MetricCard label={t('totalSets')} value={totalSets} />
            <MetricCard label={t('totalReps')} value={totalReps} />
            <MetricCard
              label={t('sessionsPerWeek')}
              value={sessionsPerWeek.toFixed(1)}
            />
            {avgDurationMinutes !== null && (
              <MetricCard label={t('avgDuration')} value={Math.round(avgDurationMinutes)} unit={t('minutesUnit')} />
            )}
          </div>
        </Card>

        <Card title={t('personalRecordsTitle')}>
          {personalRecords.length === 0 ? (
            <EmptyState compact message={t('personalRecordsEmpty')} />
          ) : (
            <div className="flex flex-col gap-3">
              {personalRecords.map((pr) => (
                <div key={pr.exerciseId} className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
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
    </div>
  );
}
