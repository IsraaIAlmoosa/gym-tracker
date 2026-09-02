'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createGoal, updateGoal } from '@/lib/actions/goals';
import { displayUnitToKg, kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { resolveGoalCurrentValue, type Goal, type GoalType } from '@/lib/goals';
import Button from '@/components/ui/Button';

type ExerciseOption = { id: string; name: string };

type CurrentValues = {
  latestWeightKg: number | null;
  latestBodyFatPercentage: number | null;
  exerciseMaxWeightKg: Record<string, number>;
  sessionsLast7Days: number;
};

type Props = {
  weightUnit: WeightUnit;
  exercises: ExerciseOption[];
  currentValues: CurrentValues;
  editing?: Goal | null;
};

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none';
const LABEL_CLASS = 'mb-1.5 block text-xs text-text-muted';

const GOAL_TYPES: GoalType[] = ['weight', 'body_fat_percentage', 'exercise_max_weight', 'workout_frequency', 'custom'];

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function GoalForm({ weightUnit, exercises, currentValues, editing }: Props) {
  const t = useTranslations('goalForm');
  const tGoals = useTranslations('goals');
  const tUnits = useTranslations('units');
  const router = useRouter();

  const [goalType, setGoalType] = useState<GoalType>(editing?.goalType ?? 'weight');
  const [exerciseId, setExerciseId] = useState<string>(editing?.exerciseId ?? exercises[0]?.id ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [targetDate, setTargetDate] = useState(editing?.targetDate ?? '');
  const [startInput, setStartInput] = useState<string>(() => {
    if (editing) {
      return goalType === 'weight' || goalType === 'exercise_max_weight'
        ? String(kgToDisplayUnit(editing.startValue, weightUnit))
        : String(editing.startValue);
    }
    return '';
  });
  const [targetInput, setTargetInput] = useState<string>(() => {
    if (!editing) return '';
    return goalType === 'weight' || goalType === 'exercise_max_weight'
      ? String(kgToDisplayUnit(editing.targetValue, weightUnit))
      : String(editing.targetValue);
  });
  const [customUnit, setCustomUnit] = useState(editing?.unit ?? '');
  const [manualCurrentInput, setManualCurrentInput] = useState<string>(
    editing?.manualCurrentValue !== undefined && editing?.manualCurrentValue !== null
      ? String(editing.manualCurrentValue)
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isMassType = goalType === 'weight' || goalType === 'exercise_max_weight';
  const massUnitLabel = tUnits(weightUnit);

  function resolvedLiveCurrent(type: GoalType): number | null {
    return resolveGoalCurrentValue({ goalType: type, exerciseId, manualCurrentValue: null }, currentValues);
  }

  function prefillStart(type: GoalType, exId: string) {
    const live =
      type === 'exercise_max_weight'
        ? (currentValues.exerciseMaxWeightKg[exId] ?? null)
        : resolvedLiveCurrent(type);
    if (live === null) {
      setStartInput('');
      return;
    }
    setStartInput(type === 'weight' || type === 'exercise_max_weight' ? String(kgToDisplayUnit(live, weightUnit)) : String(live));
  }

  function handleTypeChange(type: GoalType) {
    setGoalType(type);
    if (!editing) prefillStart(type, exerciseId);
  }

  function handleExerciseChange(exId: string) {
    setExerciseId(exId);
    if (!editing && goalType === 'exercise_max_weight') prefillStart('exercise_max_weight', exId);
  }

  async function handleSave() {
    if (title.trim() === '') {
      setErrorMsg(t('errorTitle'));
      return;
    }

    const startRaw = parseFloat(startInput);
    const targetRaw = parseFloat(targetInput);
    if (!editing && (Number.isNaN(startRaw) || Number.isNaN(targetRaw))) {
      setErrorMsg(t('errorValues'));
      return;
    }
    if (editing && Number.isNaN(targetRaw)) {
      setErrorMsg(t('errorValues'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    const unit = isMassType ? 'kg' : goalType === 'body_fat_percentage' ? '%' : goalType === 'workout_frequency' ? t('sessionsPerWeekUnit') : customUnit.trim() || t('sessionsPerWeekUnit');

    if (editing) {
      const targetValue = isMassType ? displayUnitToKg(targetRaw, weightUnit) : targetRaw;
      const manualCurrentValue =
        editing.goalType === 'custom' && manualCurrentInput.trim() !== '' ? parseFloat(manualCurrentInput) : editing.manualCurrentValue;

      const result = await updateGoal(editing.id, {
        title: title.trim(),
        targetValue,
        manualCurrentValue,
        targetDate: targetDate || null,
      });
      setSaving(false);
      if (result.success) {
        router.push('/goals');
        router.refresh();
      } else {
        setErrorMsg(t('errorGeneric'));
      }
      return;
    }

    const startValue = isMassType ? displayUnitToKg(startRaw, weightUnit) : startRaw;
    const targetValue = isMassType ? displayUnitToKg(targetRaw, weightUnit) : targetRaw;
    const manualCurrentValue = goalType === 'custom' ? startValue : null;

    const result = await createGoal({
      goalType,
      title: title.trim(),
      exerciseId: goalType === 'exercise_max_weight' ? exerciseId || null : null,
      startValue,
      targetValue,
      manualCurrentValue,
      unit,
      startDate: toLocalDateStr(new Date()),
      targetDate: targetDate || null,
    });

    setSaving(false);
    if (result.success) {
      router.push('/goals');
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL_CLASS} htmlFor="goal-type">
          {t('goalType')}
        </label>
        {editing ? (
          <p className="m-0 text-sm text-text">{tGoals(`types.${editing.goalType}`)}</p>
        ) : (
          <select
            id="goal-type"
            value={goalType}
            onChange={(e) => handleTypeChange(e.target.value as GoalType)}
            className={INPUT_CLASS}
          >
            {GOAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {tGoals(`types.${type}`)}
              </option>
            ))}
          </select>
        )}
      </div>

      {goalType === 'exercise_max_weight' && (
        <div>
          <label className={LABEL_CLASS} htmlFor="goal-exercise">
            {t('exercise')}
          </label>
          {editing ? (
            <p className="m-0 text-sm text-text">
              {exercises.find((e) => e.id === editing.exerciseId)?.name ?? '—'}
            </p>
          ) : (
            <select
              id="goal-exercise"
              value={exerciseId}
              onChange={(e) => handleExerciseChange(e.target.value)}
              className={INPUT_CLASS}
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div>
        <label className={LABEL_CLASS} htmlFor="goal-title">
          {t('title')}
        </label>
        <input
          id="goal-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          className={INPUT_CLASS}
        />
      </div>

      {goalType === 'custom' && !editing && (
        <div>
          <label className={LABEL_CLASS} htmlFor="goal-unit">
            {t('unit')}
          </label>
          <input
            id="goal-unit"
            type="text"
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            placeholder={t('unitPlaceholder')}
            className={INPUT_CLASS}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} htmlFor="goal-start">
            {t('startValue')} {isMassType ? `(${massUnitLabel})` : ''}
          </label>
          {editing ? (
            <p className="m-0 text-sm text-text">{startInput || '—'}</p>
          ) : (
            <input
              id="goal-start"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className={INPUT_CLASS}
            />
          )}
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="goal-target">
            {t('targetValue')} {isMassType ? `(${massUnitLabel})` : ''}
          </label>
          <input
            id="goal-target"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {editing?.goalType === 'custom' && (
        <div>
          <label className={LABEL_CLASS} htmlFor="goal-manual-current">
            {t('currentValue')}
          </label>
          <input
            id="goal-manual-current"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={manualCurrentInput}
            onChange={(e) => setManualCurrentInput(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      )}

      <div>
        <label className={LABEL_CLASS} htmlFor="goal-target-date">
          {t('targetDate')}
        </label>
        <input
          id="goal-target-date"
          type="date"
          value={targetDate ?? ''}
          onChange={(e) => setTargetDate(e.target.value)}
          className={`${INPUT_CLASS} [color-scheme:dark]`}
        />
      </div>

      {errorMsg && <p className="m-0 text-sm text-warn">{errorMsg}</p>}

      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? t('saving') : editing ? t('update') : t('save')}
      </Button>
    </div>
  );
}
