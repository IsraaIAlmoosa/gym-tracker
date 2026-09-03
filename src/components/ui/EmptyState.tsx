import type { ReactNode } from 'react';
import Button from './Button';

type Props = {
  icon?: ReactNode;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  compact?: boolean;
  /** 'accent' lifts the icon badge and CTA for primary, page-level empty states. */
  tone?: 'neutral' | 'accent';
};

export default function EmptyState({
  icon,
  message,
  ctaLabel,
  ctaHref,
  compact = false,
  tone = 'neutral',
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        compact ? 'py-4' : 'py-9'
      }`}
    >
      {icon && (
        <div
          className={`flex items-center justify-center rounded-full p-3.5 ${
            tone === 'accent' ? 'bg-accent/10 text-accent' : 'bg-surface-raised text-text-faint'
          }`}
        >
          {icon}
        </div>
      )}
      <p className={`m-0 text-text-muted ${compact ? 'text-xs' : 'text-sm'} leading-relaxed`}>{message}</p>
      {ctaLabel && ctaHref && (
        <Button
          href={ctaHref}
          variant={tone === 'accent' ? 'primary' : 'secondary'}
          className={compact ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm'}
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
