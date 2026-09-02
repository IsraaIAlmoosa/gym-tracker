'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  startProgram,
  abandonProgram,
  deleteProgram,
  updateProgramDayExercises,
} from '@/lib/actions/programs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export type ProgramDayDetail = {
  id: string;
  dayIndex: number;
  name: string;
  exercises: {
    id: string;
    exerciseId: string;
    name: string;
    targetSets: number | null;
    targetReps: string | null;
  }[];
};

export type ExerciseOption = { id: string; name_ar: string; name_en: string };

type Props = {
  programId: string;
  canEdit: boolean;
  days: ProgramDayDetail[];
  allExercises: ExerciseOption[];
  isActiveHere: boolean;
  activeEnrollmentId: string | null;
  hasOtherActive: boolean;
};

export default function ProgramDetailManager({
  programId,
  canEdit,
  days,
  allExercises,
  isActiveHere,
  activeEnrollmentId,
  hasOtherActive,
}: Props) {
  const isArabic = useLocale() === 'ar';
  const t = useTranslations('programs');
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pickerForDay, setPickerForDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function handleStart() {
    setBusy(true);
    setErrorMsg(null);
    const result = await startProgram(programId);
    setBusy(false);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  async function handleAbandon() {
    if (!activeEnrollmentId) return;
    if (!window.confirm(t('abandonConfirm'))) return;
    setBusy(true);
    const result = await abandonProgram(activeEnrollmentId);
    setBusy(false);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    const result = await deleteProgram(programId);
    setBusy(false);
    if (result.success) {
      router.push('/programs');
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  async function handleAddExercise(day: ProgramDayDetail, exerciseId: string) {
    const newIds = [...day.exercises.map((e) => e.exerciseId), exerciseId];
    setBusy(true);
    const result = await updateProgramDayExercises(day.id, newIds);
    setBusy(false);
    if (result.success) {
      setSearchQuery('');
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  async function handleRemoveExercise(day: ProgramDayDetail, exerciseId: string) {
    const newIds = day.exercises.map((e) => e.exerciseId).filter((id) => id !== exerciseId);
    if (newIds.length === 0) {
      setErrorMsg(t('minOneExercise'));
      return;
    }
    setBusy(true);
    const result = await updateProgramDayExercises(day.id, newIds);
    setBusy(false);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMsg && <p className="m-0 text-sm text-warn">{errorMsg}</p>}

      <div className="flex flex-wrap items-center gap-4">
        {isActiveHere ? (
          <>
            <Button href={`/workouts/new?program=${activeEnrollmentId}`} className="px-4 py-2 text-xs">
              {t('startTodaysWorkout')}
            </Button>
            <button
              type="button"
              onClick={handleAbandon}
              disabled={busy}
              className="border-none bg-transparent p-0 text-xs text-text-faint"
            >
              {t('abandon')}
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <Button onClick={handleStart} disabled={busy} className="px-4 py-2 text-xs w-fit">
              {busy ? t('starting') : t('start')}
            </Button>
            {hasOtherActive && <p className="m-0 text-xs text-text-faint">{t('startReplacesActive')}</p>}
          </div>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="border-none bg-transparent p-0 text-xs text-warn"
          >
            {t('deleteProgram')}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {days.map((day) => {
          const isPickerOpen = pickerForDay === day.id;
          const trimmedQuery = searchQuery.trim().toLowerCase();
          const availableToAdd = allExercises.filter(
            (ex) =>
              !day.exercises.some((de) => de.exerciseId === ex.id) &&
              (isArabic ? ex.name_ar : ex.name_en).toLowerCase().includes(trimmedQuery)
          );

          return (
            <Card key={day.id} title={day.name}>
              <div className="flex flex-col gap-2">
                {day.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text">{ex.name}</span>
                    <div className="flex items-center gap-2">
                      {ex.targetSets && ex.targetReps && (
                        <Badge tone="neutral">
                          {t('targetSetsReps', { sets: ex.targetSets, reps: ex.targetReps })}
                        </Badge>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(day, ex.exerciseId)}
                          disabled={busy}
                          className="border-none bg-transparent p-0 text-sm text-text-faint"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="mt-3">
                  {isPickerOpen ? (
                    <div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="mb-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
                      />
                      <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
                        {availableToAdd.length === 0 ? (
                          <p className="m-0 text-xs text-text-faint">{t('noResults')}</p>
                        ) : (
                          availableToAdd.map((ex) => (
                            <button
                              key={ex.id}
                              type="button"
                              onClick={() => handleAddExercise(day, ex.id)}
                              disabled={busy}
                              className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-start text-sm text-text"
                            >
                              {isArabic ? ex.name_ar : ex.name_en}
                              <span className="text-accent">+</span>
                            </button>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerForDay(null);
                          setSearchQuery('');
                        }}
                        className="mt-2 border-none bg-transparent p-0 text-xs text-text-faint"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPickerForDay(day.id);
                        setSearchQuery('');
                      }}
                      className="border-none bg-transparent p-0 text-xs text-accent"
                    >
                      {t('addExercise')}
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
