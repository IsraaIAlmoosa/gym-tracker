import type { ReactNode } from 'react';
import Button from './Button';

type Props = {
  icon?: ReactNode;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
};

export default function EmptyState({ icon, message, ctaLabel, ctaHref, compact = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? 'py-4' : 'py-10'
      }`}
    >
      {icon && <div className="text-text-faint">{icon}</div>}
      <p className={`m-0 text-text-muted ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>{message}</p>
      {ctaLabel && ctaHref && (
        <Button href={ctaHref} variant="secondary" className={compact ? 'px-4 py-2 text-xs' : ''}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
