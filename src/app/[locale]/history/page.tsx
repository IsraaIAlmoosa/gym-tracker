import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import type { WeightUnit } from '@/lib/units';
import HistoryManager, {
  type ActivityRow,
  type DateGroup,
  type ExerciseSets,
  type SessionRow,
} from '@/components/HistoryManager';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

type ExerciseNameRow = { name_ar: string; name_en: string };

type SetRow = {
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

export default async function HistoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { from, to } = await searchParams;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'history' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('preferred_weight_unit')
    .eq('id', user.id)
    .maybeSingle();

  let sessionsQuery = supabase
    .from('workout_sessions')
    .select('id, date, duration, created_at')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (from) sessionsQuery = sessionsQuery.gte('date', from);
  if (to) sessionsQuery = sessionsQuery.lte('date', to);

  const { data: sessions, error: sessionsError } = await sessionsQuery;

  const sessionList: SessionRow[] = sessions ?? [];
  const sessionIds = sessionList.map((s) => s.id);

  const exercisesBySession: Record<string, ExerciseSets[]> = {};
  let setsError = null;

  if (sessionIds.length > 0) {
    const { data: sets, error } = await supabase
      .from('workout_sets')
      .select('session_id, exercise_id, set_number, weight, reps, exercises(name_ar, name_en)')
      .in('session_id', sessionIds)
      .order('set_number', { ascending: true });

    setsError = error;

    for (const row of (sets ?? []) as unknown as SetRow[]) {
      const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
      const name = ex ? (isArabic ? ex.name_ar : ex.name_en) : '';
      const list = exercisesBySession[row.session_id] ?? [];
      let entry = list.find((e) => e.name === name);
      if (!entry) {
        entry = { name, sets: [] };
        list.push(entry);
      }
      entry.sets.push({ setNumber: row.set_number, weight: row.weight, reps: row.reps });
      exercisesBySession[row.session_id] = list;
    }
  }

  let activitiesQuery = supabase
    .from('activity_sessions')
    .select('id, activity_type, custom_activity_name, duration_minutes, session_date, notes')
    .order('session_date', { ascending: false });

  if (from) activitiesQuery = activitiesQuery.gte('session_date', from);
  if (to) activitiesQuery = activitiesQuery.lte('session_date', to);

  const { data: activities, error: activitiesError } = await activitiesQuery;

  if (profileError || sessionsError || setsError || activitiesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const activityList: ActivityRow[] = activities ?? [];

  const groupsByDate = new Map<string, DateGroup>();
  function getGroup(date: string): DateGroup {
    let group = groupsByDate.get(date);
    if (!group) {
      group = { date, sessions: [], activities: [] };
      groupsByDate.set(date, group);
    }
    return group;
  }

  for (const session of sessionList) {
    const exercises = exercisesBySession[session.id] ?? [];
    getGroup(session.date).sessions.push({ session, exercises });
  }
  for (const activity of activityList) {
    getGroup(activity.session_date).activities.push(activity);
  }

  const groups = Array.from(groupsByDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

  const hasFilter = Boolean(from || to);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        padding: '24px',
        paddingBottom: '100px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <a
        href={`/${locale}/dashboard`}
        style={{ color: '#A3A3A3', fontSize: '14px', textDecoration: 'none' }}
      >
        {t('back')}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 24px' }}>{t('title')}</h1>

      <form
        method="get"
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: '24px',
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div>
          <label
            style={{ display: 'block', fontSize: '12px', color: '#737373', marginBottom: '6px' }}
          >
            {t('filterFrom')}
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            style={{
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              colorScheme: 'dark',
              border: '1px solid #262626',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
            }}
          />
        </div>
        <div>
          <label
            style={{ display: 'block', fontSize: '12px', color: '#737373', marginBottom: '6px' }}
          >
            {t('filterTo')}
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            style={{
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              colorScheme: 'dark',
              border: '1px solid #262626',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            backgroundColor: '#C4F82A',
            color: '#0A0A0A',
            fontWeight: 700,
            border: 'none',
            borderRadius: '8px',
            padding: '9px 18px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {t('applyFilter')}
        </button>
        {hasFilter && (
          <a
            href={`/${locale}/history`}
            style={{
              color: '#A3A3A3',
              fontSize: '13px',
              textDecoration: 'none',
              padding: '9px 0',
            }}
          >
            {t('clearFilter')}
          </a>
        )}
      </form>

      <HistoryManager groups={groups} weightUnit={weightUnit} hasFilter={hasFilter} />
    </div>
  );
}
