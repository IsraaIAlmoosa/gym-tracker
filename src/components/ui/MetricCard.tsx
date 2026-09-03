import type { ReactNode } from 'react';

type Delta = {
  text: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether this change is favorable — direction alone doesn't imply good/bad (e.g. weight loss vs. gain goals). */
  positive?: boolean;
};

type Props = {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: Delta;
  icon?: ReactNode;
};

const ARROW: Record<Delta['direction'], string> = { up: '↑', down: '↓', flat: '→' };

export default function MetricCard({ label, value, unit, delta, icon }: Props) {
  const deltaColor =
    delta?.positive === true ? 'text-good' : delta?.positive === false ? 'text-warn' : 'text-text-muted';

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-text-faint/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold leading-none tracking-tight text-text lg:text-3xl">{value}</span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {delta && (
        <div className={`mt-2 text-xs font-semibold ${deltaColor}`}>
          {ARROW[delta.direction]} {delta.text}
        </div>
      )}
    </div>
  );
}
