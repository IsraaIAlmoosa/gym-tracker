import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/SignOutButton';

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

type Insight = {
  type: 'plateau' | 'progress' | 'pr';
  message: string;
};

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('gender')
    .eq('id', user.id)
    .maybeSingle();

  const gender = (profileRow?.gender ?? null) as 'male' | 'female' | null;
  const isFemale = gender === 'female';

  const displayName =
    user.email?.split('@')[0] ?? (isArabic ? (isFemale ? 'بطلة' : 'بطل') : 'Champion');

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, date, duration, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const sessionList: SessionRow[] = sessions ?? [];
  const sessionIds = sessionList.map((s) => s.id);

  const setsBySession: Record<string, { count: number; exerciseNames: Set<string> }> = {};

  if (sessionIds.length > 0) {
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('session_id, exercise_id, exercises(name_ar, name_en)')
      .in('session_id', sessionIds);

    for (const row of (sets ?? []) as unknown as SetRow[]) {
      const bucket = setsBySession[row.session_id] ?? {
        count: 0,
        exerciseNames: new Set<string>(),
      };
      bucket.count += 1;
      const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
      if (ex) {
        bucket.exerciseNames.add(isArabic ? ex.name_ar : ex.name_en);
      }
      setsBySession[row.session_id] = bucket;
    }
  }

  // ---------- التحليل الذكي: كشف ركود / تقدم / رقم قياسي لكل تمرين ----------
  const { data: allSets } = await supabase
    .from('workout_sets')
    .select('exercise_id, weight, reps, session_id, workout_sessions(date), exercises(name_ar, name_en)');

  type SessionBest = { date: string; maxWeight: number; reps: number };
  const byExercise: Record<string, { name: string; sessions: Map<string, SessionBest> }> = {};

  for (const row of (allSets ?? []) as unknown as SetWithSessionDate[]) {
    const session = Array.isArray(row.workout_sessions)
      ? row.workout_sessions[0]
      : row.workout_sessions;
    const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    if (!session || !ex) continue;

    const name = isArabic ? ex.name_ar : ex.name_en;
    if (!byExercise[row.exercise_id]) {
      byExercise[row.exercise_id] = { name, sessions: new Map() };
    }
    const bucket = byExercise[row.exercise_id];
    const existing = bucket.sessions.get(row.session_id);
    if (!existing || row.weight > existing.maxWeight) {
      bucket.sessions.set(row.session_id, {
        date: session.date,
        maxWeight: row.weight,
        reps: row.reps,
      });
    }
  }

  const insights: Insight[] = [];

  for (const exId in byExercise) {
    const { name, sessions } = byExercise[exId];
    const sorted = Array.from(sessions.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    if (sorted.length < 2) continue;
    const [latest, ...history] = sorted;
    const previousBest = Math.max(...history.map((h) => h.maxWeight));
    const previousSession = history[0];

    if (latest.maxWeight > previousBest) {
      insights.push({
        type: 'pr',
        message: isArabic
          ? `🏆 رقم قياسي جديد بـ${name}! رفعت ${latest.maxWeight} كغم — أعلى وزن ليك بهذا التمرين`
          : `🏆 New PR on ${name}! You lifted ${latest.maxWeight}kg — your all-time best`,
      });
    } else if (latest.maxWeight === previousSession.maxWeight && latest.reps <= previousSession.reps) {
      insights.push({
        type: 'plateau',
        message: isArabic
          ? `ركود بـ${name} — نفس الوزن (${latest.maxWeight} كغم) آخر مرتين. جرب تزيد الوزن أو التكرارات`
          : `Plateau on ${name} — same weight (${latest.maxWeight}kg) for the last two sessions. Try adding weight or reps`,
      });
    } else if (latest.maxWeight > previousSession.maxWeight) {
      insights.push({
        type: 'progress',
        message: isArabic
          ? `تقدم! رفعت ${latest.maxWeight} كغم بـ${name} (كان ${previousSession.maxWeight} كغم آخر مرة)`
          : `Progress! You lifted ${latest.maxWeight}kg on ${name} (up from ${previousSession.maxWeight}kg last time)`,
      });
    }
  }

  const insightOrder: Record<Insight['type'], number> = { pr: 0, plateau: 1, progress: 2 };
  const topInsights = insights.sort((a, b) => insightOrder[a.type] - insightOrder[b.type]).slice(0, 3);

  // ---------- سلسلة أيام التمرين: آخر 28 يوم ----------
  const DAYS_BACK = 28;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const rangeStart = new Date(todayMidnight);
  rangeStart.setDate(rangeStart.getDate() - (DAYS_BACK - 1));
  const rangeStartStr = toLocalDateStr(rangeStart);

  const { data: recentDatesRaw } = await supabase
    .from('workout_sessions')
    .select('date')
    .gte('date', rangeStartStr);

  const trainedDates = new Set((recentDatesRaw ?? []).map((r) => r.date as string));

  const streakDays: { dateStr: string; trained: boolean; label: string }[] = [];
  for (let i = DAYS_BACK - 1; i >= 0; i--) {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDateStr(d);
    streakDays.push({
      dateStr,
      trained: trainedDates.has(dateStr),
      label: d.toLocaleDateString(isArabic ? 'ar' : 'en', { day: 'numeric', month: 'short' }),
    });
  }

  const trainedCountLast28 = streakDays.filter((d) => d.trained).length;

  const t = {
    welcome: isArabic ? `أهلاً، ${displayName} 👋` : `Welcome, ${displayName} 👋`,
    subtitle: isArabic
      ? isFemale
        ? 'جاهزة لتبدئي تمرين اليوم؟'
        : 'جاهز لتبدأ تمرين اليوم؟'
      : "Ready to start today's workout?",
    startWorkout: isArabic ? 'ابدأ تمرين جديد' : 'Start New Workout',
    recentSessions: isArabic ? 'آخر التمارين' : 'Recent Sessions',
    noSessions: isArabic
      ? 'لسا ما سجلت أي تمرين. ابدأ أول جلسة وراح تظهر هنا.'
      : "You haven't logged a workout yet. Start your first session and it'll show up here.",
    insights: isArabic ? 'التحليل الذكي' : 'Smart Insights',
    insightsPlaceholder: isArabic
      ? 'راح تظهر هنا ملاحظات (زي كشف الركود) بعد ما تسجل كم تمرين.'
      : "Insights (like plateau detection) will appear here once you've logged a few workouts.",
    signOut: isArabic ? 'تسجيل خروج' : 'Sign out',
    setsLabel: isArabic ? 'سيت' : 'sets',
    minutesLabel: isArabic ? 'د' : 'min',
    noExerciseNames: '—',
    viewFullHistory: isArabic ? 'عرض كل السجل →' : 'View full history →',
    streakTitle: isArabic ? 'آخر 28 يوم' : 'Last 28 days',
    streakCount: (n: number) =>
      isArabic ? `تمرنت ${n} يوم من ${DAYS_BACK}` : `Trained ${n} of ${DAYS_BACK} days`,
  };

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', {
      day: 'numeric',
      month: 'short',
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        padding: '24px',
        paddingBottom: '84px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.02em' }}>
          Gym Tracker
        </span>
        <SignOutButton label={t.signOut} locale={locale} />
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 6px' }}>{t.welcome}</h1>
        <p style={{ color: '#A3A3A3', margin: 0, fontSize: '15px' }}>{t.subtitle}</p>
      </section>

      <a
        href={`/${locale}/workouts/new`}
        style={{
          display: 'inline-block',
          backgroundColor: '#C4F82A',
          color: '#0A0A0A',
          fontWeight: 700,
          padding: '14px 28px',
          borderRadius: '10px',
          textDecoration: 'none',
          marginBottom: '40px',
        }}
      >
        {t.startWorkout}
      </a>

      <div
        style={{
          backgroundColor: '#171717',
          border: '1px solid #262626',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '10px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#A3A3A3' }}>
            {t.streakTitle}
          </h2>
          <span style={{ fontSize: '12px', color: '#737373' }}>
            {t.streakCount(trainedCountLast28)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {streakDays.map((day) => (
            <div
              key={day.dateStr}
              title={day.label}
              style={{
                flexShrink: 0,
                width: '14px',
                height: '14px',
                borderRadius: '4px',
                backgroundColor: day.trained ? '#C4F82A' : '#262626',
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '12px',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{t.recentSessions}</h2>
            <a
              href={`/${locale}/history`}
              style={{ color: '#C4F82A', fontSize: '12px', textDecoration: 'none' }}
            >
              {t.viewFullHistory}
            </a>
          </div>
          {sessionList.length === 0 ? (
            <p style={{ color: '#A3A3A3', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              {t.noSessions}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sessionList.map((s) => {
                const bucket = setsBySession[s.id];
                const exerciseNames = bucket ? Array.from(bucket.exerciseNames) : [];
                return (
                  <div
                    key={s.id}
                    style={{ borderBottom: '1px solid #262626', paddingBottom: '10px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: '#A3A3A3',
                      }}
                    >
                      <span>{formatDate(s.date)}</span>
                      <span>
                        {bucket?.count ?? 0} {t.setsLabel}
                        {s.duration ? ` · ${s.duration} ${t.minutesLabel}` : ''}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#D4D4D4' }}>
                      {exerciseNames.length > 0
                        ? exerciseNames.join(isArabic ? '، ' : ', ')
                        : t.noExerciseNames}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: '#171717',
            border: '1px solid #262626',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600 }}>{t.insights}</h2>
          {topInsights.length === 0 ? (
            <p style={{ color: '#A3A3A3', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              {t.insightsPlaceholder}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topInsights.map((insight, i) => {
                const color =
                  insight.type === 'pr'
                    ? '#FFD700'
                    : insight.type === 'plateau'
                      ? '#FBBF24'
                      : '#4ADE80';
                return (
                  <p
                    key={i}
                    style={{
                      fontSize: '13px',
                      lineHeight: 1.6,
                      margin: 0,
                      color,
                      fontWeight: insight.type === 'pr' ? 700 : 400,
                    }}
                  >
                    {insight.message}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
