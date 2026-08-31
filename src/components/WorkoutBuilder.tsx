'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveWorkout } from '@/lib/actions/workouts';
import { CategoryIcon, getExerciseCategory, getOrderedCategories, type CategorySlug } from '@/lib/categories';
import { displayUnitToKg, kgToDisplayUnit, weightUnitLabel, type WeightUnit } from '@/lib/units';

type Exercise = {
  id: string;
  name_ar: string;
  name_en: string;
  muscle_group_ar: string | null;
  muscle_group_en: string | null;
  equipment_ar: string | null;
  equipment_en: string | null;
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
  gender: 'male' | 'female' | null;
  age: number | null;
  weightUnit: WeightUnit;
};

const OLDER_AGE_THRESHOLD = 45;

const REST_SECONDS_DEFAULT = 90;

const IMPACT_COLOR: Record<number, string> = {
  1: '#4ADE80',
  2: '#FBBF24',
  3: '#F87171',
};

const ACCENT = '#C4F82A';
const CARD_BG = '#171717';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

export default function WorkoutBuilder({
  locale,
  exercises,
  hiddenCount,
  gender,
  age,
  weightUnit,
}: Props) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const startTimeRef = useRef<number>(Date.now());
  const orderedCategories = getOrderedCategories(gender);
  const preferLowerImpactFirst = age !== null && age >= OLDER_AGE_THRESHOLD;
  const unitLabel = weightUnitLabel(weightUnit, isArabic);

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategorySlug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    backToCategories: isArabic ? '← كل المجموعات' : '← All categories',
    pickCategory: isArabic ? 'اختر مجموعة عضلية' : 'Choose a muscle group',
    hiddenNote: (n: number) =>
      isArabic
        ? `تم إخفاء ${n} تمرين بسبب إعدادات المناطق المتجنبة`
        : `${n} exercise${n === 1 ? '' : 's'} hidden based on your avoided-areas settings`,
    noExercisesAdded: isArabic
      ? 'ما ضفت أي تمرين للجلسة بعد. اختر مجموعة عضلية من فوق وابدأ.'
      : "You haven't added any exercise yet. Pick a muscle group above to start.",
    noExercisesInCategory: isArabic
      ? 'كل تمارين هذي المجموعة مضافة بالفعل'
      : 'All exercises in this group are already added',
    searchPlaceholder: isArabic ? 'ابحث عن تمرين...' : 'Search exercises...',
    noSearchResults: isArabic ? 'ما فيه نتائج مطابقة' : 'No matching exercises',
    weight: isArabic ? `الوزن (${unitLabel})` : `Weight (${unitLabel})`,
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
    impact: {
      1: isArabic ? 'خفيف' : 'Low',
      2: isArabic ? 'متوسط' : 'Medium',
      3: isArabic ? 'عالي' : 'High',
    } as Record<number, string>,
  };

  const addedIds = new Set(sessionExercises.map((se) => se.exercise.id));
  const pickableExercises = exercises.filter((ex) => !addedIds.has(ex.id));

  const remainingByCategory: Record<string, number> = {};
  for (const ex of pickableExercises) {
    const cat = getExerciseCategory(ex.name_en);
    remainingByCategory[cat] = (remainingByCategory[cat] ?? 0) + 1;
  }

  const exercisesInActiveCategory = activeCategory
    ? pickableExercises
        .filter((ex) => getExerciseCategory(ex.name_en) === activeCategory)
        .slice()
        .sort((a, b) => {
          if (!preferLowerImpactFirst) return 0;
          return (a.impact_level ?? 2) - (b.impact_level ?? 2);
        })
    : [];

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const searchResults = trimmedQuery
    ? pickableExercises.filter((ex) =>
        (isArabic ? ex.name_ar : ex.name_en).toLowerCase().includes(trimmedQuery)
      )
    : [];

  function renderExerciseRow(ex: Exercise) {
    const impactColor = ex.impact_level ? IMPACT_COLOR[ex.impact_level] : MUTED;
    const impactLabel = ex.impact_level ? t.impact[ex.impact_level] : null;
    const equipmentLabel = isArabic ? ex.equipment_ar : ex.equipment_en;
    return (
      <button
        key={ex.id}
        onClick={() => addExerciseById(ex.id)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '10px',
          padding: '12px 16px',
          cursor: 'pointer',
          textAlign: isArabic ? 'right' : 'left',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>
              {isArabic ? ex.name_ar : ex.name_en}
            </span>
            {equipmentLabel && (
              <span
                style={{
                  padding: '1px 7px',
                  borderRadius: '999px',
                  backgroundColor: '#262626',
                  color: '#A3A3A3',
                  fontSize: '10px',
                  fontWeight: 500,
                }}
              >
                {equipmentLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: MUTED, marginTop: '2px' }}>
            {isArabic ? ex.muscle_group_ar : ex.muscle_group_en}
            {impactLabel && <span style={{ color: impactColor }}> · {impactLabel}</span>}
          </div>
        </div>
        <span style={{ color: ACCENT, fontSize: '20px', fontWeight: 700 }}>+</span>
      </button>
    );
  }

  function addExerciseById(id: string) {
    const exercise = exercises.find((ex) => ex.id === id);
    if (!exercise) return;
    setSessionExercises((prev) => [
      ...prev,
      { exercise, sets: [], draftWeight: '', draftReps: '' },
    ]);
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
        const enteredWeight = parseFloat(se.draftWeight);
        const reps = parseInt(se.draftReps, 10);
        if (Number.isNaN(enteredWeight) || Number.isNaN(reps) || reps <= 0) return se;
        const newSet: LoggedSet = {
          setNumber: se.sets.length + 1,
          weight: displayUnitToKg(enteredWeight, weightUnit),
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
            backgroundColor: CARD_BG,
            border: `1px solid ${ACCENT}`,
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
              color: ACCENT,
              border: `1px solid ${ACCENT}`,
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
        style={{ color: MUTED, fontSize: '14px', textDecoration: 'none' }}
      >
        {t.back}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 20px' }}>{t.title}</h1>

      {hiddenCount > 0 && (
        <p style={{ color: '#FBBF24', fontSize: '13px', marginBottom: '20px' }}>
          {t.hiddenNote(hiddenCount)}
        </p>
      )}

      <div style={{ marginBottom: '28px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={{
            width: '100%',
            backgroundColor: CARD_BG,
            color: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '14px',
            marginBottom: '16px',
          }}
        />

        {trimmedQuery ? (
          searchResults.length === 0 ? (
            <p style={{ color: MUTED, fontSize: '14px' }}>{t.noSearchResults}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((ex) => renderExerciseRow(ex))}
            </div>
          )
        ) : activeCategory === null ? (
          <>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: MUTED, margin: '0 0 12px' }}>
              {t.pickCategory}
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '10px',
              }}
            >
              {orderedCategories.map((cat) => {
                const remaining = remainingByCategory[cat.slug] ?? 0;
                const disabled = remaining === 0;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => !disabled && setActiveCategory(cat.slug)}
                    disabled={disabled}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: CARD_BG,
                      border: `1px solid ${CARD_BORDER}`,
                      borderRadius: '14px',
                      padding: '16px 8px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <CategoryIcon slug={cat.slug} color={disabled ? MUTED : ACCENT} />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: disabled ? MUTED : '#FFFFFF',
                        textAlign: 'center',
                      }}
                    >
                      {isArabic ? cat.ar : cat.en}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                background: 'none',
                border: 'none',
                color: ACCENT,
                fontSize: '14px',
                cursor: 'pointer',
                padding: 0,
                marginBottom: '14px',
              }}
            >
              {t.backToCategories}
            </button>

            {exercisesInActiveCategory.length === 0 ? (
              <p style={{ color: MUTED, fontSize: '14px' }}>{t.noExercisesInCategory}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {exercisesInActiveCategory.map((ex) => renderExerciseRow(ex))}
              </div>
            )}
          </>
        )}
      </div>

      {sessionExercises.length === 0 && (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t.noExercisesAdded}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sessionExercises.map((se, index) => {
          const impactColor = se.exercise.impact_level
            ? IMPACT_COLOR[se.exercise.impact_level]
            : MUTED;
          const impactLabel = se.exercise.impact_level
            ? t.impact[se.exercise.impact_level]
            : null;

          return (
            <div
              key={se.exercise.id}
              style={{
                backgroundColor: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
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
                    color: MUTED,
                    border: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t.remove}
                </button>
              </div>

              {se.sets.length === 0 ? (
                <p style={{ color: MUTED, fontSize: '13px', margin: '10px 0' }}>{t.noSetsYet}</p>
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
                      <span style={{ color: MUTED, width: '48px' }}>
                        {t.setLabel} {s.setNumber}
                      </span>
                      <span>
                        {kgToDisplayUnit(s.weight, weightUnit)} {unitLabel}
                      </span>
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
                    border: `1px solid ${CARD_BORDER}`,
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
                    border: `1px solid ${CARD_BORDER}`,
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
          borderTop: `1px solid ${CARD_BORDER}`,
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
