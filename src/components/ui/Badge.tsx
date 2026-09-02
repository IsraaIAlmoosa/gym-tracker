import type { ReactNode } from 'react';

type Tone = 'gold' | 'good' | 'warn' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  gold: 'bg-gold/15 text-gold',
  good: 'bg-good/15 text-good',
  warn: 'bg-warn/15 text-warn',
  neutral: 'bg-surface-raised text-text-muted',
};

export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
