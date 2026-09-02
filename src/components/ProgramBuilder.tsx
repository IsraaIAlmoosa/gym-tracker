'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createCustomProgram } from '@/lib/actions/programs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type ExerciseOption = { id: string; name_ar: string; name_en: string };

type DraftDay = { id: string; name: string; exerciseIds: string[] };

type Props = {
  allExercises: ExerciseOption[];
};

export default function ProgramBuilder({ allExercises }: Props) {
  const isArabic = useLocale() === 'ar';
  const t = useTranslations('programBuilder');
  const router = useRouter();

  const [name, setName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [days, setDays] = useState<DraftDay[]>([]);
  const [pickerForDay, setPickerForDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function addDay() {
    setDays((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: t('dayDefaultName', { n: prev.length + 1 }), exerciseIds: [] },
    ]);
  }

  function removeDay(dayId: string) {
    setDays((prev) => prev.filter((d) => d.id !== dayId));
  }

  function renameDay(dayId: string, value: string) {
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, name: value } : d)));
  }

  function addExerciseToDay(dayId: string, exerciseId: string) {
    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, exerciseIds: [...d.exerciseIds, exerciseId] } : d))
    );
    setSearchQuery('');
  }

  function removeExerciseFromDay(dayId: string, exerciseId: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, exerciseIds: d.exerciseIds.filter((id) => id !== exerciseId) } : d
      )
    );
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    const weeks = parseInt(durationWeeks, 10);
    const validDays = days.filter((d) => d.exerciseIds.length > 0);

    if (!trimmedName) {
      setErrorMsg(t('errorName'));
      return;
    }
    if (Number.isNaN(weeks) || weeks <= 0) {
      setErrorMsg(t('errorDuration'));
      return;
    }
    if (validDays.length === 0) {
      setErrorMsg(t('errorNoDays'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    const result = await createCustomProgram({
      name: trimmedName,
      durationWeeks: weeks,
      days: validDays.map((d) => ({ name: d.name.trim() || t('dayDefaultName', { n: 1 }), exerciseIds: d.exerciseIds })),
    });

    setSaving(false);

    if (result.success) {
      router.push('/programs');
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <label className="mb-1.5 block text-xs font-medium text-text-muted">{t('nameLabel')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="mb-4 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
        <label className="mb-1.5 block text-xs font-medium text-text-muted">{t('durationLabel')}</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={durationWeeks}
          onChange={(e) => setDurationWeeks(e.target.value)}
          className="w-full max-w-[140px] rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none"
        />
      </Card>

      <div className="flex flex-col gap-4">
        {days.map((day, index) => {
          const isPickerOpen = pickerForDay === day.id;
          const trimmedQuery = searchQuery.trim().toLowerCase();
          const availableToAdd = allExercises.filter(
            (ex) =>
              !day.exerciseIds.includes(ex.id) &&
              (isArabic ? ex.name_ar : ex.name_en).toLowerCase().includes(trimmedQuery)
          );

          return (
            <Card key={day.id}>
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="text"
                  value={day.name}
                  onChange={(e) => renameDay(day.id, e.target.value)}
                  placeholder={t('dayDefaultName', { n: index + 1 })}
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeDay(day.id)}
                  className="border-none bg-transparent p-0 text-xs text-warn"
                >
                  {t('removeDay')}
                </button>
              </div>

              {day.exerciseIds.length === 0 ? (
                <p className="m-0 mb-3 text-xs text-text-faint">{t('noExercisesInDay')}</p>
              ) : (
                <div className="mb-3 flex flex-wrap gap-2">
                  {day.exerciseIds.map((exerciseId) => {
                    const ex = allExercises.find((e) => e.id === exerciseId);
                    return (
                      <span
                        key={exerciseId}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-bg py-1 ps-3 pe-1.5 text-xs text-text"
                      >
                        {ex ? (isArabic ? ex.name_ar : ex.name_en) : ''}
                        <button
                          type="button"
                          onClick={() => removeExerciseFromDay(day.id, exerciseId)}
                          className="border-none bg-transparent p-0.5 text-sm leading-none text-text-faint"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

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
                          onClick={() => addExerciseToDay(day.id, ex.id)}
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
            </Card>
          );
        })}
      </div>

      <Button onClick={addDay} variant="ghost" className="w-fit">
        {t('addDay')}
      </Button>

      {errorMsg && <p className="m-0 text-sm text-warn">{errorMsg}</p>}

      <Button onClick={handleSubmit} disabled={saving} className="w-fit">
        {saving ? t('saving') : t('save')}
      </Button>
    </div>
  );
}
