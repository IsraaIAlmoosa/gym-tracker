'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import SignOutButton from './SignOutButton';

const localeLabels: Record<string, string> = {
  ar: 'ع',
  en: 'EN',
};

export default function TopBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const tSign = useTranslations('dashboard');

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-4 py-3 lg:hidden">
      <span className="text-base font-bold tracking-tight text-text">Gym Tracker</span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          {routing.locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={
                loc === locale
                  ? 'font-semibold text-accent no-underline'
                  : 'text-text-faint no-underline hover:text-text'
              }
            >
              {localeLabels[loc]}
            </Link>
          ))}
        </div>
        <SignOutButton label={tSign('signOut')} locale={locale} />
      </div>
    </header>
  );
}
