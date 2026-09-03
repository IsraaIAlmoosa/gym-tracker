'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { isNoAppChromeRoute } from '@/lib/chrome';
import {
  HomeIcon,
  HistoryIcon,
  PlusCircleIcon,
  DumbbellIcon,
  ProgressIcon,
  ScaleIcon,
  SettingsIcon,
} from './ui/icons';

const ACTIVE_COLOR = '#C4F82A';
const INACTIVE_COLOR = '#737373';

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('bottomNav');

  if (isNoAppChromeRoute(pathname)) {
    return null;
  }

  const items = [
    { href: '/dashboard', label: t('home'), Icon: HomeIcon, active: pathname === '/' || pathname.startsWith('/dashboard') },
    { href: '/history', label: t('history'), Icon: HistoryIcon, active: pathname.startsWith('/history') },
    { href: '/workouts/new', label: t('start'), Icon: PlusCircleIcon, active: pathname.startsWith('/workouts') },
    { href: '/exercises', label: t('exercises'), Icon: DumbbellIcon, active: pathname.startsWith('/exercises') },
    { href: '/progress', label: t('progress'), Icon: ProgressIcon, active: pathname.startsWith('/progress') },
    { href: '/inbody', label: t('inbody'), Icon: ScaleIcon, active: pathname.startsWith('/inbody') },
    { href: '/settings', label: t('settings'), Icon: SettingsIcon, active: pathname.startsWith('/settings') },
  ];

  return (
    <nav
      className="fixed bottom-0 start-0 end-0 z-20 flex h-16 items-center justify-around border-t border-border bg-bg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center gap-0.5 text-[11px] no-underline ${
            active ? 'font-bold text-accent' : 'font-normal text-text-faint'
          }`}
        >
          <Icon color={active ? ACTIVE_COLOR : INACTIVE_COLOR} filled={href === '/workouts/new' && active} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
