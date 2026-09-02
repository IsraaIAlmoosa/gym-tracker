import type { ReactNode } from 'react';

type Props = {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Card({ title, action, children, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className="m-0 text-[15px] font-semibold text-text">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
