import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90',
  secondary: 'bg-transparent text-accent border border-accent hover:bg-accent/10',
  ghost: 'bg-transparent text-text border border-border hover:bg-surface-raised',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-opacity no-underline disabled:cursor-not-allowed disabled:opacity-50';

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type LinkProps = CommonProps & {
  href: string;
};

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export default function Button(props: LinkProps | ButtonProps) {
  const { variant = 'primary', children, className = '' } = props;
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`;

  if ('href' in props && props.href !== undefined) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const rest = props as ButtonProps;
  return (
    <button type={rest.type ?? 'button'} onClick={rest.onClick} disabled={rest.disabled} className={classes}>
      {children}
    </button>
  );
}
