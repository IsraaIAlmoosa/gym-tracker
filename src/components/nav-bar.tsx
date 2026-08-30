"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  ar: "العربية",
  en: "English",
};

export function NavBar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="border-b border-black/[.08] dark:border-white/[.145]">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="hover:opacity-70">
            {t("home")}
          </Link>
          <Link href="/workouts/new" className="hover:opacity-70">
            {t("workouts")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 text-sm">
          {routing.locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              className={
                loc === locale
                  ? "font-semibold underline"
                  : "opacity-60 hover:opacity-100"
              }
            >
              {localeLabels[loc]}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
