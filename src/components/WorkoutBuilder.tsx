'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveWorkout } from '@/lib/actions/workouts';

type Exercise = {
  id: string;
  name_ar: string;
  name_en: string;
  muscle_group_ar: string | null;
  muscle_group_en: string | null;
  affects_areas: string[] | null;
  impact_level: number | null;
};

type LoggedSet = {
  setNumber: number;
  weight: number;
  reps: number;
};

type SessionExercise = {
  exercise: Exercise;
  sets: LoggedSet[];
  draftWeight: string;
  draftReps: string;
};

type Props = {
  locale: string;
  exercises: Exercise[];
  hiddenCount: number;
};

const REST_SECONDS_DEFAULT = 90;

const IMPACT_COLOR: Record<number, string> = {
  1: '#4ADE80',
  2: '#FBBF24',
  3: '#F87171',
};

export default function WorkoutBuilder({ locale, exercises, hiddenCount }: Props) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const startTimeRef = useRef<number>(Date.now());

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [pickerValue, setPickerValue] = useState('');
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) {
      setRestSeconds(null);
      return;
    }
    const timeout = setTimeout(() => {
      setRestSeconds((s) => (s !== null ? s - 1 : null));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [restSeconds]);

  const t = {
    title: isArabic ? 'تسجيل تمرين جديد' : 'New Workout',
    back: isArabic ? '← رجوع للداشبورد' : '← Back to dashboard',
    addExercise: isArabic ? 'اختر تمرين لإضافته' : 'Choose an exercise to add',
    addButton: isArabic ? 'إضافة' : 'Add',
    hiddenNote: (n: number) =>
      isArabic
        ? `تم إخفاء ${n} تمرين بسبب إعدادات المناطق المتجنبة`
        : `${n} exercise${n === 1 ? '' : 's'} hidden based on your avoided-areas settings`,
    noExercisesAdded: isArabic
      ? 'ما ضفت أي تمرين للجلسة بعد. اختر تمرين من فوق وابدأ.'
      : "You haven't added any exercise yet. Pick one above to start.",
    weight: isArabic ? 'الوزن (كغم)' : 'Weight (kg)',
    reps: isArabic ? 'التكرارات' : 'Reps',
    addSet: isArabic ? 'إضافة سيت' : 'Add set',
    setLabel: isArabic ? 'سيت' : 'Set',
    noSetsYet: isArabic ? 'لسا ما سجلت أي سيت لهذا التمرين' : 'No sets logged for this exercise yet',
    remove: isArabic ? 'إزالة' : 'Remove',
    restTitle: isArabic ? 'وقت الراحة' : 'Rest time',
    skipRest: isArabic ? 'تخطي' : 'Skip',
    save: isArabic ? 'حفظ التمرين' : 'Save workout',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    errorNoSets: isArabic
      ? 'سجل سيت وحد على الأقل قبل الحفظ'
      : 'Log at least one set before saving',
    errorGeneric: isArabic
      ? 'صار خطأ أثناء الحفظ، حاول مرة ثانية'
      : 'Something went wrong while saving, please try again',
    impact: { 1: isArabic ? 'خفيف' : 'Low', 2: isArabic ? 'متوسط' : 'Medium', 3: isArabic ? 'عالي' : 'High' } as Record<number, string>,
  };

  const addedIds = new Set(sessionExercises.map((se) => se.exercise.id));
  const pickableExercises = exercises.filter((ex) => !addedIds.has(ex.id));

  function handleAddExercise() {
    const exercise = exercises.find((ex) => ex.id === pickerValue);
    if (!exercise) return;
    setSessionExercises((prev) => [
      ...prev,
      { exercise, sets: [], draftWeight: '', draftReps: '' },
    ]);
    setPickerValue('');
  }

  function updateDraft(index: number, field: 'draftWeight' | 'draftReps', value: string) {
    setSessionExercises((prev) =>
      prev.map((se, i) => (i === index ? { ...se, [field]: value } : se))
    );
  }

  function handleAddSet(index: number) {
    setSessionExercises((prev) =>
      prev.map((se, i) => {
        if (i !== index) return se;
        const weight = parseFloat(se.draftWeight);
        const reps = parseInt(se.draftReps, 10);
        if (Number.isNaN(weight) || Number.isNaN(reps) || reps <= 0) return se;
        const newSet: LoggedSet = {
          setNumber: se.sets.length + 1,
          weight,
          reps,
        };
        return {
          ...se,
          sets: [...se.sets, newSet],
          draftWeight: '',
          draftReps: '',
        };
      })
    );
    setRestSeconds(REST_SECONDS_DEFAULT);
  }

  function handleRemoveExercise(index: number) {
    setSessionExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const flatSets = sessionExercises.flatMap((se) =>
      se.sets.map((s) => ({
        exerciseId: se.exercise.id,
        setNumber: s.setNumber,
        weight: s.weight,
        reps: s.reps,
      }))
    );

    if (flatSets.length === 0) {
      setErrorMsg(t.errorNoSets);
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 60000)
    );

    const result = await saveWorkout({ sets: flatSets, durationMinutes });

    if (!result.success) {
      setSaving(false);
      setErrorMsg(t.errorGeneric);
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  const totalSets = sessionExercises.reduce((sum, se) => sum + se.sets.length, 0);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        padding: '24px',
        paddingBottom: '180px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {restSeconds !== null && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#171717',
            border: '1px solid #C4F82A',
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 700 }}>
            {t.restTitle}: {restSeconds}s
          </span>
          <button
            onClick={() => setRestSeconds(null)}
            style={{
              backgroundColor: 'transparent',
              color: '#C4F82A',
              border: '1px solid #C4F82A',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {t.skipRest}
          </button>
        </div>
      )}

      <a
        href={`/${locale}/dashboard`}
        style={{ color: '#A3A3A3', fontSize: '14px', textDecoration: 'none' }}
      >
        {t.back}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 20px' }}>{t.title}</h1>

      {hiddenCount > 0 && (
        <p style={{ color: '#FBBF24', fontSize: '13px', marginBottom: '20px' }}>
          {t.hiddenNote(hiddenCount)}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}
      >
        <select
          value={pickerValue}
          onChange={(e) => setPickerValue(e.target.value)}
          style={{
            flex: '1 1 240px',
            backgroundColor: '#171717',
            color: '#FFFFFF',
            border: '1px solid #262626',
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        >
          <option value="">{t.addExercise}</option>
          {pickableExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {isArabic ? ex.name_ar : ex.name_en}
            </option>
          ))}
        </select>
        <button
          onClick={handleAddExercise}
          disabled={!pickerValue}
          style={{
            backgroundColor: pickerValue ? '#C4F82A' : '#262626',
            color: pickerValue ? '#0A0A0A' : '#737373',
            fontWeight: 700,
            border: 'none',
            borderRadius: '8px',
            padding: '10px 22px',
            cursor: pickerValue ? 'pointer' : 'not-allowed',
          }}
        >
          {t.addButton}
        </button>
      </div>

      {sessionExercises.length === 0 && (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t.noExercisesAdded}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sessionExercises.map((se, index) => {
          const impactColor = se.exercise.impact_level
            ? IMPACT_COLOR[se.exercise.impact_level]
            : '#737373';
          const impactLabel = se.exercise.impact_level
            ? t.impact[se.exercise.impact_level]
            : null;

          return (
            <div
              key={se.exercise.id}
              style={{
                backgroundColor: '#171717',
                border: '1px solid #262626',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                    {isArabic ? se.exercise.name_ar : se.exercise.name_en}
                  </h2>
                  <p style={{ color: '#A3A3A3', fontSize: '13px', margin: '4px 0 0' }}>
                    {isArabic ? se.exercise.muscle_group_ar : se.exercise.muscle_group_en}
                    {impactLabel && (
                      <span style={{ color: impactColor }}> · {impactLabel}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(index)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#737373',
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t.remove}
                </button>
              </div>

              {se.sets.length === 0 ? (
                <p style={{ color: '#737373', fontSize: '13px', margin: '10px 0' }}>
                  {t.noSetsYet}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '10px 0' }}>
                  {se.sets.map((s) => (
                    <div
                      key={s.setNumber}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        fontSize: '14px',
                        color: '#D4D4D4',
                      }}
                    >
                      <span style={{ color: '#737373', width: '48px' }}>
                        {t.setLabel} {s.setNumber}
                      </span>
                      <span>{s.weight} kg</span>
                      <span>× {s.reps}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={t.weight}
                  value={se.draftWeight}
                  onChange={(e) => updateDraft(index, 'draftWeight', e.target.value)}
                  style={{
                    flex: '1 1 100px',
                    backgroundColor: '#0A0A0A',
                    color: '#FFFFFF',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={t.reps}
                  value={se.draftReps}
                  onChange={(e) => updateDraft(index, 'draftReps', e.target.value)}
                  style={{
                    flex: '1 1 100px',
                    backgroundColor: '#0A0A0A',
                    color: '#FFFFFF',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={() => handleAddSet(index)}
                  style={{
                    backgroundColor: '#262626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  {t.addSet}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '64px',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          backgroundColor: '#0A0A0A',
          borderTop: '1px solid #262626',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          {errorMsg && (
            <p style={{ color: '#F87171', fontSize: '13px', margin: 0 }}>{errorMsg}</p>
          )}
          <p style={{ color: '#A3A3A3', fontSize: '13px', margin: 0 }}>
            {totalSets} {t.setLabel}
            {isArabic ? '' : totalSets === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#4ADE80',
            color: '#0A0A0A',
            fontWeight: 700,
            border: 'none',
            borderRadius: '10px',
            padding: '14px 32px',
            fontSize: '15px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  );
}
