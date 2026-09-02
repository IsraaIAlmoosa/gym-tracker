'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import SignOutButton from './SignOutButton';
import {
  HomeIcon,
  HistoryIcon,
  PlusCircleIcon,
  ScaleIcon,
  SettingsIcon,
} from './ui/icons';

const ACTIVE_COLOR = '#C4F82A';
const INACTIVE_COLOR = '#737373';

const localeLabels: Record<string, string> = {
  ar: 'العربية',
  en: 'English',
};

export default function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('bottomNav');
  const tSign = useTranslations('dashboard');

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null;
  }

  const items = [
    { href: '/dashboard', label: t('home'), Icon: HomeIcon, active: pathname === '/' || pathname.startsWith('/dashboard') },
    { href: '/history', label: t('history'), Icon: HistoryIcon, active: pathname.startsWith('/history') },
    { href: '/workouts/new', label: t('start'), Icon: PlusCircleIcon, active: pathname.startsWith('/workouts') },
    { href: '/inbody', label: t('inbody'), Icon: ScaleIcon, active: pathname.startsWith('/inbody') },
    { href: '/settings', label: t('settings'), Icon: SettingsIcon, active: pathname.startsWith('/settings') },
  ];

  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e border-border bg-bg px-4 py-6 lg:flex">
      <span className="mb-8 px-2 text-lg font-bold tracking-tight text-text">Gym Tracker</span>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
              active ? 'bg-surface text-accent' : 'text-text-faint hover:bg-surface hover:text-text'
            }`}
          >
            <Icon color={active ? ACTIVE_COLOR : INACTIVE_COLOR} size={20} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2 px-2 text-xs">
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
        <SignOutButton label={tSign('signOut')} locale={locale} className="w-full px-4 py-2 text-xs" />
      </div>
    </aside>
  );
}
