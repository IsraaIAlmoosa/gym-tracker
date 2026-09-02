import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { calculateGoalProgress, type Goal } from '@/lib/goals';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';

type Props = {
  goal: Goal;
  currentValue: number | null;
  weightUnit: WeightUnit;
  onMarkComplete?: () => void;
  onAbandon?: () => void;
  busy?: boolean;
};

const MASS_TYPES = new Set(['weight', 'exercise_max_weight']);

export default function GoalCard({ goal, currentValue, weightUnit, onMarkComplete, onAbandon, busy }: Props) {
  const t = useTranslations('goals');

  function formatValue(value: number): string {
    if (MASS_TYPES.has(goal.goalType)) return `${kgToDisplayUnit(value, weightUnit).toFixed(1)} ${weightUnit}`;
    if (goal.goalType === 'body_fat_percentage') return `${value.toFixed(1)}%`;
    return `${value} ${goal.unit}`;
  }

  const progress = currentValue !== null ? calculateGoalProgress(goal.startValue, currentValue, goal.targetValue) : null;

  const daysRemaining = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-sm font-semibold text-text">{goal.title}</h3>
          {goal.status !== 'active' && (
            <div className="mt-1">
              <Badge tone={goal.status === 'completed' ? 'good' : 'neutral'}>{t(`status.${goal.status}`)}</Badge>
            </div>
          )}
        </div>
        {daysRemaining !== null && goal.status === 'active' && (
          <span className="shrink-0 text-xs text-text-faint">
            {daysRemaining >= 0 ? t('daysLeft', { n: daysRemaining }) : t('overdue', { n: Math.abs(daysRemaining) })}
          </span>
        )}
      </div>

      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-text-muted">
          {t('current')}: <span className="font-bold text-text">{currentValue !== null ? formatValue(currentValue) : '—'}</span>
        </span>
        <span className="text-text-muted">
          {t('target')}: <span className="font-bold text-text">{formatValue(goal.targetValue)}</span>
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>

      {onMarkComplete && onAbandon && goal.status === 'active' && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={onMarkComplete}
            disabled={busy}
            className="border-none bg-transparent p-0 text-xs text-good"
          >
            {t('markComplete')}
          </button>
          <button
            type="button"
            onClick={onAbandon}
            disabled={busy}
            className="border-none bg-transparent p-0 text-xs text-text-faint"
          >
            {t('abandon')}
          </button>
          <Button href={`/goals/${goal.id}/edit`} variant="ghost" className="ms-auto px-3 py-1 text-xs">
            {t('edit')}
          </Button>
        </div>
      )}
    </Card>
  );
}
