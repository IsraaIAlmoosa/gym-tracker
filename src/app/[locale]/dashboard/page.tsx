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

  const displayName = user.email?.split('@')[0] ?? (isArabic ? 'بطل' : 'Champion');

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

  const t = {
    welcome: isArabic ? `أهلاً، ${displayName} 👋` : `Welcome, ${displayName} 👋`,
    subtitle: isArabic ? 'جاهز لتبدأ تمرين اليوم؟' : "Ready to start today's workout?",
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
          <h2 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>
            {t.recentSessions}
          </h2>
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
          <p style={{ color: '#A3A3A3', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
            {t.insightsPlaceholder}
          </p>
        </div>
      </div>
    </div>
  );
}
