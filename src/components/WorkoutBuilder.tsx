'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveWorkout, updateWorkoutSession } from '@/lib/actions/workouts';
import { saveRoutineFromSession } from '@/lib/actions/routines';
import { CategoryIcon, getExerciseCategory, getOrderedCategories, type CategorySlug } from '@/lib/categories';
import { displayUnitToKg, kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { TrophyIcon } from '@/components/ui/icons';

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

export type SessionExercise = {
  exercise: Exercise;
  sets: LoggedSet[];
  draftWeight: string;
  draftReps: string;
};

type RoutineOption = {
  id: string;
  name: string;
  exerciseIds: string[];
};

type Props = {
  locale: string;
  exercises: Exercise[];
  hiddenCount: number;
  gender: 'male' | 'female' | null;
  age: number | null;
  weightUnit: WeightUnit;
  routines: RoutineOption[];
  lastSetByExercise: Record<string, { weight: number; reps: number }>;
  personalRecordByExercise: Record<string, { weight: number; reps: number }>;
  editingSessionId?: string;
  initialSessionExercises?: SessionExercise[];
  initialDurationMinutes?: number;
};

const OLDER_AGE_THRESHOLD = 45;

const REST_SECONDS_DEFAULT = 90;
const REST_PRESETS = [60, 90, 120, 150];
const REST_ADJUST_STEP = 15;
const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };
const REPS_STEP = 1;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const IMPACT_COLOR: Record<number, string> = {
  1: '#4ADE80',
  2: '#FBBF24',
  3: '#F87171',
};

const ACCENT = '#C4F82A';
const CARD_BG = '#171717';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

const restAdjustButtonStyle: CSSProperties = {
  backgroundColor: '#262626',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const stepperButtonStyle: CSSProperties = {
  width: '30px',
  height: '30px',
  flexShrink: 0,
  backgroundColor: '#262626',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function WorkoutBuilder({
  locale,
  exercises,
  hiddenCount,
  gender,
  age,
  weightUnit,
  routines,
  lastSetByExercise,
  personalRecordByExercise,
  editingSessionId,
  initialSessionExercises,
  initialDurationMinutes,
}: Props) {
  const isArabic = locale === 'ar';
  const t = useTranslations('workoutBuilder');
  const tUnits = useTranslations('units');
  const router = useRouter();
  const startTimeRef = useRef<number | null>(null);
  const sessionBestRef = useRef<Record<string, { weight: number; reps: number }>>({});
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);
  const orderedCategories = getOrderedCategories(gender);
  const preferLowerImpactFirst = age !== null && age >= OLDER_AGE_THRESHOLD;
  const unitLabel = tUnits(weightUnit);

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    () => initialSessionExercises ?? []
  );
  const [editDuration, setEditDuration] = useState(() => String(initialDurationMinutes ?? 1));
  const [activeCategory, setActiveCategory] = useState<CategorySlug | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restDuration, setRestDuration] = useState(REST_SECONDS_DEFAULT);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [prCelebration, setPrCelebration] = useState<{
    exerciseName: string;
    weightKg: number;
    reps: number;
    previousWeightKg: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSaveRoutineForm, setShowSaveRoutineForm] = useState(false);
  const [routineNameInput, setRoutineNameInput] = useState('');
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [routineSaveMsg, setRoutineSaveMsg] = useState<string | null>(null);

  function playRestAlert() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      osc.onended = () => ctx.close();
    } catch {
      // ignore — sound is a nice-to-have, not critical
    }
  }

  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds === 0) {
      playRestAlert();
      const timeout = setTimeout(() => {
        setRestSeconds(null);
        setRestTotal(null);
      }, 1500);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setRestSeconds((s) => (s !== null ? s - 1 : null));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [restSeconds]);

  useEffect(() => {
    if (editingSessionId) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [editingSessionId]);

  useEffect(() => {
    if (!prCelebration) return;
    const timeout = setTimeout(() => setPrCelebration(null), 4000);
    return () => clearTimeout(timeout);
  }, [prCelebration]);

  function startRest() {
    setRestSeconds(restDuration);
    setRestTotal(restDuration);
  }

  function adjustRest(delta: number) {
    setRestSeconds((s) => {
      if (s === null) return s;
      const next = Math.max(0, s + delta);
      setRestTotal((total) => (total !== null && next > total ? next : total));
      return next;
    });
  }

  const IMPACT_KEY: Record<number, 'low' | 'medium' | 'high'> = { 1: 'low', 2: 'medium', 3: 'high' };
  function impactLabelFor(level: number) {
    return t(`impact.${IMPACT_KEY[level] ?? 'medium'}`);
  }

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
    const impactLabel = ex.impact_level ? impactLabelFor(ex.impact_level) : null;
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
    const last = lastSetByExercise[id];
    const draftWeight = last ? String(kgToDisplayUnit(last.weight, weightUnit)) : '';
    const draftReps = last ? String(last.reps) : '';
    setSessionExercises((prev) => [...prev, { exercise, sets: [], draftWeight, draftReps }]);
  }

  function startFromRoutine(routine: RoutineOption) {
    const alreadyAddedIds = new Set(sessionExercises.map((se) => se.exercise.id));
    for (const exerciseId of routine.exerciseIds) {
      if (alreadyAddedIds.has(exerciseId)) continue;
      addExerciseById(exerciseId);
    }
  }

  async function handleSaveRoutine() {
    const name = routineNameInput.trim();
    if (!name || sessionExercises.length === 0) return;

    setSavingRoutine(true);
    setRoutineSaveMsg(null);

    const result = await saveRoutineFromSession({
      name,
      exerciseIds: sessionExercises.map((se) => se.exercise.id),
    });

    setSavingRoutine(false);

    if (result.success) {
      setRoutineSaveMsg(t('routineSaved'));
      setShowSaveRoutineForm(false);
      setRoutineNameInput('');
      router.refresh();
    } else {
      setRoutineSaveMsg(t('routineSaveError'));
    }
  }

  function updateDraft(index: number, field: 'draftWeight' | 'draftReps', value: string) {
    setSessionExercises((prev) =>
      prev.map((se, i) => (i === index ? { ...se, [field]: value } : se))
    );
  }

  function checkForPR(exercise: Exercise, newSet: LoggedSet) {
    const serverBest = personalRecordByExercise[exercise.id];
    const sessionBest = sessionBestRef.current[exercise.id];
    const bestKnown = [serverBest, sessionBest].reduce<{ weight: number; reps: number } | undefined>(
      (best, candidate) => {
        if (!candidate) return best;
        if (!best) return candidate;
        if (candidate.weight > best.weight || (candidate.weight === best.weight && candidate.reps > best.reps)) {
          return candidate;
        }
        return best;
      },
      undefined
    );

    if (
      bestKnown &&
      (newSet.weight > bestKnown.weight || (newSet.weight === bestKnown.weight && newSet.reps > bestKnown.reps))
    ) {
      setPrCelebration({
        exerciseName: isArabic ? exercise.name_ar : exercise.name_en,
        weightKg: newSet.weight,
        reps: newSet.reps,
        previousWeightKg: bestKnown.weight,
      });
    }

    if (
      !sessionBest ||
      newSet.weight > sessionBest.weight ||
      (newSet.weight === sessionBest.weight && newSet.reps > sessionBest.reps)
    ) {
      sessionBestRef.current[exercise.id] = { weight: newSet.weight, reps: newSet.reps };
    }
  }

  function commitSet(index: number, weightKg: number, reps: number) {
    const se = sessionExercises[index];
    if (!se) return;
    const newSet: LoggedSet = { setNumber: se.sets.length + 1, weight: weightKg, reps };

    setSessionExercises((prev) =>
      prev.map((s, i) =>
        i !== index ? s : { ...s, sets: [...s.sets, newSet], draftWeight: '', draftReps: '' }
      )
    );

    startRest();
    checkForPR(se.exercise, newSet);
  }

  function handleAddSet(index: number) {
    const se = sessionExercises[index];
    if (!se) return;
    const enteredWeight = parseFloat(se.draftWeight);
    const reps = parseInt(se.draftReps, 10);
    if (Number.isNaN(enteredWeight) || Number.isNaN(reps) || reps <= 0) return;
    commitSet(index, displayUnitToKg(enteredWeight, weightUnit), reps);
  }

  function handleRepeatLastSet(index: number) {
    const se = sessionExercises[index];
    if (!se || se.sets.length === 0) return;
    const last = se.sets[se.sets.length - 1];
    commitSet(index, last.weight, last.reps);
  }

  function adjustDraftWeight(index: number, delta: number) {
    setSessionExercises((prev) =>
      prev.map((se, i) => {
        if (i !== index) return se;
        const current = parseFloat(se.draftWeight) || 0;
        const next = Math.max(0, Math.round((current + delta) * 100) / 100);
        return { ...se, draftWeight: String(next) };
      })
    );
  }

  function adjustDraftReps(index: number, delta: number) {
    setSessionExercises((prev) =>
      prev.map((se, i) => {
        if (i !== index) return se;
        const current = parseInt(se.draftReps, 10) || 0;
        const next = Math.max(0, current + delta);
        return { ...se, draftReps: String(next) };
      })
    );
  }

  function handleRemoveExercise(index: number) {
    setSessionExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateSetWeight(exerciseIndex: number, setIndex: number, rawValue: string) {
    const parsed = parseFloat(rawValue);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setSessionExercises((prev) =>
      prev.map((se, i) =>
        i !== exerciseIndex
          ? se
          : {
              ...se,
              sets: se.sets.map((s, j) =>
                j !== setIndex ? s : { ...s, weight: displayUnitToKg(parsed, weightUnit) }
              ),
            }
      )
    );
  }

  function handleUpdateSetReps(exerciseIndex: number, setIndex: number, rawValue: string) {
    const parsed = parseInt(rawValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    setSessionExercises((prev) =>
      prev.map((se, i) =>
        i !== exerciseIndex
          ? se
          : { ...se, sets: se.sets.map((s, j) => (j !== setIndex ? s : { ...s, reps: parsed })) }
      )
    );
  }

  function handleRemoveSet(exerciseIndex: number, setIndex: number) {
    setSessionExercises((prev) =>
      prev.map((se, i) => {
        if (i !== exerciseIndex) return se;
        const remaining = se.sets.filter((_, j) => j !== setIndex);
        return { ...se, sets: remaining.map((s, idx) => ({ ...s, setNumber: idx + 1 })) };
      })
    );
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
      setErrorMsg(t('errorNoSets'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    const durationMinutes = editingSessionId
      ? Math.max(1, parseInt(editDuration, 10) || 1)
      : Math.max(1, Math.round((Date.now() - (startTimeRef.current ?? Date.now())) / 60000));

    const result = editingSessionId
      ? await updateWorkoutSession(editingSessionId, { sets: flatSets, durationMinutes })
      : await saveWorkout({ sets: flatSets, durationMinutes });

    if (!result.success) {
      setSaving(false);
      setErrorMsg(t('errorGeneric'));
      return;
    }

    router.push(`/${locale}/${editingSessionId ? 'history' : 'dashboard'}`);
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
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{t('restTitle')}</span>
            <span style={{ fontWeight: 700, fontSize: '24px', fontVariantNumeric: 'tabular-nums' }}>
              {restSeconds === 0 ? t('restDone') : formatClock(restSeconds)}
            </span>
          </div>

          <div
            style={{
              height: '4px',
              borderRadius: '999px',
              backgroundColor: CARD_BORDER,
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '999px',
                backgroundColor: ACCENT,
                width: `${restTotal ? Math.min(100, ((restTotal - restSeconds) / restTotal) * 100) : 0}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => adjustRest(-REST_ADJUST_STEP)}
                style={restAdjustButtonStyle}
              >
                −{REST_ADJUST_STEP}s
              </button>
              <button
                onClick={() => adjustRest(REST_ADJUST_STEP)}
                style={restAdjustButtonStyle}
              >
                +{REST_ADJUST_STEP}s
              </button>
            </div>
            <button
              onClick={() => {
                setRestSeconds(null);
                setRestTotal(null);
              }}
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
              {t('skipRest')}
            </button>
          </div>
        </div>
      )}

      <a
        href={`/${locale}/${editingSessionId ? 'history' : 'dashboard'}`}
        style={{ color: MUTED, fontSize: '14px', textDecoration: 'none' }}
      >
        {editingSessionId ? t('backToHistory') : t('back')}
      </a>

      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '10px 0 4px' }}>
        {editingSessionId ? t('editTitle') : t('title')}
      </h1>

      {!editingSessionId && (
        <p style={{ color: MUTED, fontSize: '13px', margin: '0 0 16px', fontVariantNumeric: 'tabular-nums' }}>
          {t('sessionDuration', { time: formatClock(elapsedSeconds) })}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: MUTED, fontSize: '13px' }}>{t('restDurationLabel')}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {REST_PRESETS.map((preset) => {
            const selected = preset === restDuration;
            return (
              <button
                key={preset}
                onClick={() => setRestDuration(preset)}
                style={{
                  backgroundColor: selected ? ACCENT : CARD_BG,
                  color: selected ? '#0A0A0A' : '#FFFFFF',
                  border: `1px solid ${selected ? ACCENT : CARD_BORDER}`,
                  borderRadius: '999px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {preset}s
              </button>
            );
          })}
        </div>
      </div>

      {hiddenCount > 0 && (
        <p style={{ color: '#FBBF24', fontSize: '13px', marginBottom: '20px' }}>
          {t('hiddenNote', { n: hiddenCount })}
        </p>
      )}

      {routines.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: MUTED, margin: '0 0 12px' }}>
            {t('startFromRoutine')}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {routines.map((routine) => (
              <button
                key={routine.id}
                onClick={() => startFromRoutine(routine)}
                style={{
                  backgroundColor: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: '10px',
                  padding: '10px 16px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {routine.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
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
            <p style={{ color: MUTED, fontSize: '14px' }}>{t('noSearchResults')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((ex) => renderExerciseRow(ex))}
            </div>
          )
        ) : activeCategory === null ? (
          <>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: MUTED, margin: '0 0 12px' }}>
              {t('pickCategory')}
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
              {t('backToCategories')}
            </button>

            {exercisesInActiveCategory.length === 0 ? (
              <p style={{ color: MUTED, fontSize: '14px' }}>{t('noExercisesInCategory')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {exercisesInActiveCategory.map((ex) => renderExerciseRow(ex))}
              </div>
            )}
          </>
        )}
      </div>

      {sessionExercises.length === 0 && (
        <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t('noExercisesAdded')}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sessionExercises.map((se, index) => {
          const impactColor = se.exercise.impact_level
            ? IMPACT_COLOR[se.exercise.impact_level]
            : MUTED;
          const impactLabel = se.exercise.impact_level
            ? impactLabelFor(se.exercise.impact_level)
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
                  {personalRecordByExercise[se.exercise.id] && (
                    <p style={{ color: ACCENT, fontSize: '12px', margin: '4px 0 0', fontWeight: 600 }}>
                      {t('currentRecord', {
                        weight: kgToDisplayUnit(personalRecordByExercise[se.exercise.id].weight, weightUnit),
                        unit: unitLabel,
                      })}
                    </p>
                  )}
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
                  {t('remove')}
                </button>
              </div>

              {se.sets.length === 0 ? (
                <p style={{ color: MUTED, fontSize: '13px', margin: '10px 0' }}>{t('noSetsYet')}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '10px 0' }}>
                  {se.sets.map((s, setIndex) => (
                    <div
                      key={`${se.exercise.id}-${setIndex}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#D4D4D4',
                      }}
                    >
                      <span style={{ color: MUTED, width: '48px', flexShrink: 0 }}>
                        {t('setNumberLabel', { n: s.setNumber })}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        defaultValue={kgToDisplayUnit(s.weight, weightUnit)}
                        onBlur={(e) => handleUpdateSetWeight(index, setIndex, e.target.value)}
                        style={{
                          width: '64px',
                          backgroundColor: '#0A0A0A',
                          color: '#FFFFFF',
                          border: `1px solid ${CARD_BORDER}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '14px',
                        }}
                      />
                      <span style={{ color: MUTED }}>{unitLabel}</span>
                      <span>×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        defaultValue={s.reps}
                        onBlur={(e) => handleUpdateSetReps(index, setIndex, e.target.value)}
                        style={{
                          width: '56px',
                          backgroundColor: '#0A0A0A',
                          color: '#FFFFFF',
                          border: `1px solid ${CARD_BORDER}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '14px',
                        }}
                      />
                      <button
                        onClick={() => handleRemoveSet(index, setIndex)}
                        aria-label={t('removeSet')}
                        style={{
                          marginInlineStart: 'auto',
                          backgroundColor: 'transparent',
                          color: MUTED,
                          border: 'none',
                          fontSize: '16px',
                          lineHeight: 1,
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => adjustDraftWeight(index, -WEIGHT_STEP[weightUnit])}
                  aria-label={t('decreaseWeight')}
                  style={stepperButtonStyle}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={t('weight', { unit: unitLabel })}
                  value={se.draftWeight}
                  onChange={(e) => updateDraft(index, 'draftWeight', e.target.value)}
                  style={{
                    flex: '1 1 90px',
                    backgroundColor: '#0A0A0A',
                    color: '#FFFFFF',
                    border: `1px solid ${CARD_BORDER}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => adjustDraftWeight(index, WEIGHT_STEP[weightUnit])}
                  aria-label={t('increaseWeight')}
                  style={stepperButtonStyle}
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => adjustDraftReps(index, -REPS_STEP)}
                  aria-label={t('decreaseReps')}
                  style={stepperButtonStyle}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={t('reps')}
                  value={se.draftReps}
                  onChange={(e) => updateDraft(index, 'draftReps', e.target.value)}
                  style={{
                    flex: '1 1 70px',
                    backgroundColor: '#0A0A0A',
                    color: '#FFFFFF',
                    border: `1px solid ${CARD_BORDER}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => adjustDraftReps(index, REPS_STEP)}
                  aria-label={t('increaseReps')}
                  style={stepperButtonStyle}
                >
                  +
                </button>

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
                  {t('addSet')}
                </button>
              </div>

              {se.sets.length > 0 && (
                <button
                  onClick={() => handleRepeatLastSet(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: ACCENT,
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: 0,
                    marginTop: '10px',
                  }}
                >
                  {t('repeatLastSet', {
                    weight: kgToDisplayUnit(se.sets[se.sets.length - 1].weight, weightUnit),
                    unit: unitLabel,
                    reps: se.sets[se.sets.length - 1].reps,
                  })}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {sessionExercises.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          {showSaveRoutineForm ? (
            <div
              style={{
                backgroundColor: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={routineNameInput}
                onChange={(e) => setRoutineNameInput(e.target.value)}
                placeholder={t('routineNamePlaceholder')}
                style={{
                  flex: '1 1 160px',
                  backgroundColor: '#0A0A0A',
                  color: '#FFFFFF',
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={handleSaveRoutine}
                disabled={savingRoutine || !routineNameInput.trim()}
                style={{
                  backgroundColor: ACCENT,
                  color: '#0A0A0A',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  cursor: savingRoutine ? 'not-allowed' : 'pointer',
                }}
              >
                {savingRoutine ? t('savingRoutine') : t('saveRoutine')}
              </button>
              <button
                onClick={() => {
                  setShowSaveRoutineForm(false);
                  setRoutineNameInput('');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: MUTED,
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveRoutineForm(true)}
              style={{
                background: 'none',
                border: 'none',
                color: ACCENT,
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {t('saveAsRoutine')}
            </button>
          )}
          {routineSaveMsg && (
            <p style={{ color: '#A3A3A3', fontSize: '13px', margin: '8px 0 0' }}>
              {routineSaveMsg}
            </p>
          )}
        </div>
      )}

      {editingSessionId && (
        <div style={{ marginTop: '16px', maxWidth: '220px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
            {t('durationLabel')}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step="1"
            value={editDuration}
            onChange={(e) => setEditDuration(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
            }}
          />
        </div>
      )}

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
            {t('totalSetsCount', { n: totalSets })}
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
          {saving ? t('saving') : editingSessionId ? t('update') : t('save')}
        </button>
      </div>

      {prCelebration && (
        <div
          onClick={() => setPrCelebration(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: CARD_BG,
              border: `1px solid ${ACCENT}`,
              borderRadius: '20px',
              padding: '32px 24px',
              maxWidth: '340px',
              width: '100%',
              textAlign: 'center',
              animation: 'prPop 0.35s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <TrophyIcon color={ACCENT} size={48} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: ACCENT }}>
              {t('prCelebrationTitle')}
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px' }}>
              {prCelebration.exerciseName}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0' }}>
              {kgToDisplayUnit(prCelebration.weightKg, weightUnit)} {unitLabel} × {prCelebration.reps}
            </p>
            <p style={{ fontSize: '13px', color: MUTED, margin: '4px 0 20px' }}>
              {t('prPreviousBest', {
                weight: kgToDisplayUnit(prCelebration.previousWeightKg, weightUnit),
                unit: unitLabel,
              })}
            </p>
            <button
              onClick={() => setPrCelebration(null)}
              style={{
                backgroundColor: ACCENT,
                color: '#0A0A0A',
                fontWeight: 700,
                border: 'none',
                borderRadius: '10px',
                padding: '10px 28px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              {t('prCelebrationClose')}
            </button>
          </div>
          <style>{`
            @keyframes prPop {
              from { transform: scale(0.85); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
