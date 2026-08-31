'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { renameRoutine, deleteRoutine, updateRoutineExercises } from '@/lib/actions/routines';

type ExerciseOption = { id: string; name_ar: string; name_en: string };
type RoutineExercise = { exerciseId: string; name: string };
type Routine = { id: string; name: string; exercises: RoutineExercise[] };

type Props = {
  routines: Routine[];
  allExercises: ExerciseOption[];
};

export default function RoutineManager({ routines, allExercises }: Props) {
  const isArabic = useLocale() === 'ar';
  const t = useTranslations('routineManager');
  const router = useRouter();

  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(routines.map((r) => [r.id, r.name]))
  );
  const [openPickerFor, setOpenPickerFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  async function handleRename(routineId: string) {
    const name = (nameDrafts[routineId] ?? '').trim();
    if (!name) return;
    setBusyId(routineId);
    setErrorMsg((prev) => ({ ...prev, [routineId]: '' }));
    const result = await renameRoutine(routineId, name);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [routineId]: t('errorGeneric') }));
    }
  }

  async function handleDelete(routineId: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusyId(routineId);
    const result = await deleteRoutine(routineId);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [routineId]: t('errorGeneric') }));
    }
  }

  async function handleAddExercise(routine: Routine, exerciseId: string) {
    const newIds = [...routine.exercises.map((e) => e.exerciseId), exerciseId];
    setBusyId(routine.id);
    const result = await updateRoutineExercises(routine.id, newIds);
    setBusyId(null);
    if (result.success) {
      setSearchQuery('');
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [routine.id]: t('errorGeneric') }));
    }
  }

  async function handleRemoveExercise(routine: Routine, exerciseId: string) {
    const newIds = routine.exercises.map((e) => e.exerciseId).filter((id) => id !== exerciseId);
    if (newIds.length === 0) {
      setErrorMsg((prev) => ({ ...prev, [routine.id]: t('minOneExercise') }));
      return;
    }
    setBusyId(routine.id);
    const result = await updateRoutineExercises(routine.id, newIds);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [routine.id]: t('errorGeneric') }));
    }
  }

  if (routines.length === 0) {
    return <p style={{ color: '#A3A3A3', fontSize: '14px' }}>{t('noRoutines')}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {routines.map((routine) => {
        const isPickerOpen = openPickerFor === routine.id;
        const trimmedQuery = searchQuery.trim().toLowerCase();
        const availableToAdd = allExercises.filter(
          (ex) =>
            !routine.exercises.some((re) => re.exerciseId === ex.id) &&
            (isArabic ? ex.name_ar : ex.name_en).toLowerCase().includes(trimmedQuery)
        );

        return (
          <div
            key={routine.id}
            style={{
              backgroundColor: '#171717',
              border: '1px solid #262626',
              borderRadius: '12px',
              padding: '18px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={nameDrafts[routine.id] ?? ''}
                onChange={(e) =>
                  setNameDrafts((prev) => ({ ...prev, [routine.id]: e.target.value }))
                }
                style={{
                  flex: '1 1 140px',
                  backgroundColor: '#0A0A0A',
                  color: '#FFFFFF',
                  border: '1px solid #262626',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={() => handleRename(routine.id)}
                disabled={busyId === routine.id || nameDrafts[routine.id] === routine.name}
                style={{
                  backgroundColor: '#C4F82A',
                  color: '#0A0A0A',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('saveName')}
              </button>
              <button
                onClick={() => handleDelete(routine.id)}
                disabled={busyId === routine.id}
                style={{
                  backgroundColor: 'transparent',
                  color: '#F87171',
                  border: '1px solid #F87171',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t('delete')}
              </button>
            </div>

            {errorMsg[routine.id] && (
              <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 10px' }}>
                {errorMsg[routine.id]}
              </p>
            )}

            {routine.exercises.length === 0 ? (
              <p style={{ color: '#737373', fontSize: '13px', margin: '0 0 10px' }}>
                {t('noExercisesInRoutine')}
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {routine.exercises.map((ex) => (
                  <span
                    key={ex.exerciseId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #262626',
                      borderRadius: '999px',
                      padding: '4px 6px 4px 12px',
                      fontSize: '13px',
                    }}
                  >
                    {ex.name}
                    <button
                      onClick={() => handleRemoveExercise(routine, ex.exerciseId)}
                      disabled={busyId === routine.id}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#737373',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                        padding: '2px 4px',
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {isPickerOpen ? (
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  style={{
                    width: '100%',
                    backgroundColor: '#0A0A0A',
                    color: '#FFFFFF',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '13px',
                    marginBottom: '8px',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {availableToAdd.length === 0 ? (
                    <p style={{ color: '#737373', fontSize: '13px' }}>{t('noResults')}</p>
                  ) : (
                    availableToAdd.map((ex) => (
                      <button
                        key={ex.id}
                        onClick={() => handleAddExercise(routine, ex.id)}
                        disabled={busyId === routine.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          backgroundColor: '#0A0A0A',
                          border: '1px solid #262626',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          textAlign: isArabic ? 'right' : 'left',
                        }}
                      >
                        {isArabic ? ex.name_ar : ex.name_en}
                        <span style={{ color: '#C4F82A' }}>+</span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => {
                    setOpenPickerFor(null);
                    setSearchQuery('');
                  }}
                  style={{
                    marginTop: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#737373',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {t('cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setOpenPickerFor(routine.id);
                  setSearchQuery('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#C4F82A',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('addExercise')}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
