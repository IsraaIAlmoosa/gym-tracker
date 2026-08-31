import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import { kgToDisplayUnit, weightUnitLabel, type WeightUnit } from '@/lib/units';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
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
  set_number: number;
  weight: number;
  reps: number;
  exercises: ExerciseNameRow | ExerciseNameRow[] | null;
};

type ExerciseSets = {
  name: string;
  sets: { setNumber: number; weight: number; reps: number }[];
};

type DateGroup = {
  date: string;
  sessions: { session: SessionRow; exercises: ExerciseSets[] }[];
};

export default async function HistoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { from, to } = await searchParams;
  const isArabic = locale === 'ar';

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

  if (profileError || sessionsError || setsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const weightUnit = (profile?.preferred_weight_unit ?? 'kg') as WeightUnit;
  const unitLabel = weightUnitLabel(weightUnit, isArabic);

  const groups: DateGroup[] = [];
  for (const session of sessionList) {
    const exercises = exercisesBySession[session.id] ?? [];
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === session.date) {
      lastGroup.sessions.push({ session, exercises });
    } else {
      groups.push({ date: session.date, sessions: [{ session, exercises }] });
    }
  }

  const t = {
    title: isArabic ? 'السجل' : 'History',
    back: isArabic ? '← رجوع للداشبورد' : '← Back to dashboard',
    filterFrom: isArabic ? 'من تاريخ' : 'From',
    filterTo: isArabic ? 'إلى تاريخ' : 'To',
    applyFilter: isArabic ? 'تصفية' : 'Filter',
    clearFilter: isArabic ? 'مسح التصفية' : 'Clear filter',
    noSessions: isArabic
      ? 'ما فيه أي جلسات تمرين مسجلة بعد.'
      : "You haven't logged any workout sessions yet.",
    noSessionsInRange: isArabic
      ? 'ما فيه جلسات بهذا النطاق الزمني.'
      : 'No sessions in this date range.',
    setsLabel: isArabic ? 'سيت' : 'sets',
    minutesLabel: isArabic ? 'د' : 'min',
  };

  function formatDateHeading(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

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
        {t.back}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 24px' }}>{t.title}</h1>

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
            {t.filterFrom}
          </label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            style={{
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
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
            {t.filterTo}
          </label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            style={{
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
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
          {t.applyFilter}
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
            {t.clearFilter}
          </a>
        )}
      </form>

      {groups.length === 0 ? (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>
          {hasFilter ? t.noSessionsInRange : t.noSessions}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groups.map((group) => (
            <div key={group.date}>
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#C4F82A',
                  margin: '0 0 10px',
                }}
              >
                {formatDateHeading(group.date)}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.sessions.map(({ session, exercises }) => {
                  const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
                  return (
                    <div
                      key={session.id}
                      style={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '12px',
                        padding: '16px 20px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          color: '#A3A3A3',
                          marginBottom: '12px',
                        }}
                      >
                        <span>
                          {totalSets} {t.setsLabel}
                        </span>
                        {session.duration && (
                          <span>
                            {session.duration} {t.minutesLabel}
                          </span>
                        )}
                      </div>
                      {exercises.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {exercises.map((ex) => (
                            <div key={ex.name}>
                              <div
                                style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}
                              >
                                {ex.name}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  fontSize: '13px',
                                  color: '#D4D4D4',
                                }}
                              >
                                {ex.sets.map((s) => (
                                  <span
                                    key={s.setNumber}
                                    style={{
                                      backgroundColor: '#0A0A0A',
                                      border: '1px solid #262626',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                    }}
                                  >
                                    {kgToDisplayUnit(s.weight, weightUnit)} {unitLabel} × {s.reps}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
