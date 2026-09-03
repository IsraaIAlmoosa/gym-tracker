'use client';

import { usePathname } from '@/i18n/navigation';
import { isNoAppChromeRoute } from '@/lib/chrome';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reserveSidebarSpace = !isNoAppChromeRoute(pathname);

  return (
    <main className={`flex-1 flex flex-col ${reserveSidebarSpace ? 'lg:ps-64' : ''}`}>
      {children}
    </main>
  );
}
