'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

const ACTIVE_COLOR = '#C4F82A';
const INACTIVE_COLOR = '#737373';

function HomeIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

function ProgressIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M21 7v6h-6" />
    </svg>
  );
}

function SettingsIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

function PlusCircleIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="2"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke={filled ? '#0A0A0A' : color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const isArabic = locale === 'ar';

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    return null;
  }

  const isHome = pathname === '/' || pathname.startsWith('/dashboard');
  const isWorkout = pathname.startsWith('/workouts');
  const isProgress = pathname.startsWith('/measurements');
  const isSettings = pathname.startsWith('/settings');

  const t = {
    home: isArabic ? 'الرئيسية' : 'Home',
    start: isArabic ? 'ابدأ' : 'Start',
    progress: isArabic ? 'التقدم' : 'Progress',
    settings: isArabic ? 'الإعدادات' : 'Settings',
  };

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        height: '64px',
        backgroundColor: '#0A0A0A',
        borderTop: '1px solid #262626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 20,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Link
        href="/dashboard"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isHome ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontSize: '11px',
          fontWeight: isHome ? 700 : 400,
        }}
      >
        <HomeIcon color={isHome ? ACTIVE_COLOR : INACTIVE_COLOR} />
        {t.home}
      </Link>

      <Link
        href="/workouts/new"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isWorkout ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontSize: '11px',
          fontWeight: isWorkout ? 700 : 400,
        }}
      >
        <PlusCircleIcon color={isWorkout ? ACTIVE_COLOR : INACTIVE_COLOR} filled={isWorkout} />
        {t.start}
      </Link>

      <Link
        href="/measurements"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isProgress ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontSize: '11px',
          fontWeight: isProgress ? 700 : 400,
        }}
      >
        <ProgressIcon color={isProgress ? ACTIVE_COLOR : INACTIVE_COLOR} />
        {t.progress}
      </Link>

      <Link
        href="/settings"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          textDecoration: 'none',
          color: isSettings ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontSize: '11px',
          fontWeight: isSettings ? 700 : 400,
        }}
      >
        <SettingsIcon color={isSettings ? ACTIVE_COLOR : INACTIVE_COLOR} />
        {t.settings}
      </Link>
    </nav>
  );
}
