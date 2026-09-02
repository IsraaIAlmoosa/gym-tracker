'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setGoalStatus, deleteGoal } from '@/lib/actions/goals';
import { resolveGoalCurrentValue, type Goal, type GoalCurrentValueContext } from '@/lib/goals';
import type { WeightUnit } from '@/lib/units';
import GoalCard from '@/components/GoalCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

type Props = {
  goals: Goal[];
  currentValues: GoalCurrentValueContext;
  weightUnit: WeightUnit;
};

export default function GoalsManager({ goals, currentValues, weightUnit }: Props) {
  const t = useTranslations('goals');
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const pastGoals = goals.filter((g) => g.status !== 'active');

  async function handleMarkComplete(id: string) {
    setBusyId(id);
    await setGoalStatus(id, 'completed');
    setBusyId(null);
    router.refresh();
  }

  async function handleAbandon(id: string) {
    if (!window.confirm(t('abandonConfirm'))) return;
    setBusyId(id);
    await setGoalStatus(id, 'abandoned');
    setBusyId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusyId(id);
    await deleteGoal(id);
    setBusyId(null);
    router.refresh();
  }

  if (goals.length === 0) {
    return <EmptyState message={t('empty')} ctaLabel={t('addFirst')} ctaHref="/goals/new" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {activeGoals.length === 0 ? (
        <EmptyState compact message={t('noActive')} ctaLabel={t('addFirst')} ctaHref="/goals/new" />
      ) : (
        activeGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            currentValue={resolveGoalCurrentValue(goal, currentValues)}
            weightUnit={weightUnit}
            onMarkComplete={() => handleMarkComplete(goal.id)}
            onAbandon={() => handleAbandon(goal.id)}
            busy={busyId === goal.id}
          />
        ))
      )}

      {pastGoals.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="border-none bg-transparent p-0 text-sm text-text-muted"
          >
            {showPast ? t('hidePast') : t('showPast', { n: pastGoals.length })}
          </button>
          {showPast && (
            <div className="mt-3 flex flex-col gap-3">
              {pastGoals.map((goal) => (
                <div key={goal.id} className="relative">
                  <GoalCard goal={goal} currentValue={resolveGoalCurrentValue(goal, currentValues)} weightUnit={weightUnit} />
                  <button
                    type="button"
                    onClick={() => handleDelete(goal.id)}
                    disabled={busyId === goal.id}
                    className="absolute end-4 top-4 border-none bg-transparent p-0 text-xs text-warn"
                  >
                    {t('delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Button href="/goals/new" className="w-fit">
        {t('addNew')}
      </Button>
    </div>
  );
}
