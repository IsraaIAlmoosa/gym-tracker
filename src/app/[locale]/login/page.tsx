'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { createClient, setRememberMePreference } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ProgressIcon, DumbbellIcon, TrophyIcon } from '@/components/ui/icons'

type Mode = 'sign-in' | 'sign-up' | 'forgot-password'

const localeLabels: Record<string, string> = { ar: 'العربية', en: 'English' }

const INPUT_CLASS =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-text placeholder:text-text-faint transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
const LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-text-muted'

export default function LoginPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const t = useTranslations('login')

  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Wired to a real short vs. long session — see setRememberMePreference /
  // src/lib/supabase/remember-me.ts for how this survives @supabase/ssr
  // always trying to persist the session cookie for 400 days.
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  const handleGoogleLogin = async () => {
    // Must be set before redirecting to Google: the cookie survives the
    // round trip (Google -> our own /auth/callback) since it's set on our
    // origin, and the callback route's server-side Supabase client reads it
    // the same way the password sign-in path does.
    setRememberMePreference(rememberMe)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
      },
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()

    if (mode === 'forgot-password') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(t('resetEmailSent'))
      }
    } else if (mode === 'sign-up') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(t('checkEmail'))
      }
    } else {
      // Must be set before signing in: the browser client reads this cookie
      // synchronously, from inside signInWithPassword's own cookie writes,
      // to decide whether the session cookie should persist or expire with
      // the browser session.
      setRememberMePreference(rememberMe)
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        router.push(`/${locale}/dashboard`)
      }
    }

    setLoading(false)
  }

  const features = [
    { Icon: ProgressIcon, title: t('feature1Title'), desc: t('feature1Desc') },
    { Icon: DumbbellIcon, title: t('feature2Title'), desc: t('feature2Desc') },
    { Icon: TrophyIcon, title: t('feature3Title'), desc: t('feature3Desc') },
  ]

  return (
    <div className="flex min-h-screen bg-bg" dir="ltr">
      {/* Hero panel — image side always renders first (left) regardless of locale */}
      <div className="relative hidden overflow-hidden lg:block lg:w-[55%]" dir={dir}>
        <Image
          src="/auth-hero.png"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover object-[62%_18%]"
        />
        {/* Cinematic layering: vertical read for text legibility + a soft side vignette for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <span className="text-lg font-extrabold tracking-tight text-white">GYM TRACKER</span>

          <div>
            <h1 className="m-0 max-w-md text-[2.75rem] font-extrabold leading-[1.1] tracking-tight text-white xl:text-6xl">
              <span className="block">{t('heroTitle')}</span>
              <span className="block text-accent">{t('heroTitleAccent')}</span>
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/80">{t('heroSubtitle')}</p>

            <div className="mt-9 flex flex-col gap-4">
              {features.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Icon color="#C4F82A" size={20} />
                  </div>
                  <div>
                    <p className="m-0 text-sm font-semibold text-white">{title}</p>
                    <p className="m-0 text-xs text-white/70">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="m-0 mt-8 max-w-sm border-s-2 border-accent ps-3 text-sm italic text-white/70">
              {t('quote')}
            </p>
          </div>

          <p className="m-0 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
            {t('brandTagline')}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col lg:w-[45%]" dir={dir}>
        <div className="flex justify-end p-4">
          <div className="flex items-center gap-2 text-xs">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href="/login"
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
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className="w-full max-w-sm">
            {/* Mobile hero banner — reduced significantly so the login form stays the priority */}
            <div className="relative mb-5 h-24 overflow-hidden rounded-2xl lg:hidden" dir={dir}>
              <Image
                src="/auth-hero.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[62%_15%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="relative z-10 flex h-full flex-col justify-end p-3.5">
                <span className="mb-0.5 text-[11px] font-bold tracking-tight text-white/70">GYM TRACKER</span>
                <h1 className="m-0 text-base font-extrabold leading-tight text-white">
                  {t('heroTitle')} <span className="text-accent">{t('heroTitleAccent')}</span>
                </h1>
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div className="mb-6 flex gap-1 rounded-xl border border-border bg-surface p-1">
                <button
                  type="button"
                  onClick={() => switchMode('sign-in')}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    mode === 'sign-in' ? 'bg-accent text-accent-ink' : 'text-text-faint hover:text-text'
                  }`}
                >
                  {t('signInTab')}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('sign-up')}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    mode === 'sign-up' ? 'bg-accent text-accent-ink' : 'text-text-faint hover:text-text'
                  }`}
                >
                  {t('signUpTab')}
                </button>
              </div>
            )}

            <h2 className="m-0 text-2xl font-bold tracking-tight text-text">
              {mode === 'forgot-password'
                ? t('resetPasswordTitle')
                : mode === 'sign-up'
                  ? t('createAccountTitle')
                  : t('welcomeBackTitle')}
            </h2>
            <p className="mt-1.5 text-sm text-text-muted">
              {mode === 'forgot-password'
                ? t('resetPasswordSubtitle')
                : mode === 'sign-up'
                  ? t('createAccountSubtitle')
                  : t('welcomeBackSubtitle')}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="login-email">
                  {t('emailPlaceholder')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </div>

              {mode !== 'forgot-password' && (
                <div>
                  <label className={LABEL_CLASS} htmlFor="login-password">
                    {t('passwordPlaceholder')}
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className={INPUT_CLASS}
                  />
                </div>
              )}

              {mode === 'sign-in' && (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-text-muted">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    {t('rememberMe')}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="border-none bg-transparent p-0 text-accent no-underline hover:underline"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}

              {error && <p className="m-0 text-sm text-warn">{error}</p>}
              {message && <p className="m-0 text-sm text-good">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-accent-ink shadow-[0_8px_24px_-8px_rgba(196,248,42,0.45)] transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {mode === 'forgot-password' ? t('sendResetLink') : mode === 'sign-up' ? t('createAccount') : t('signIn')}
              </button>

              {mode === 'forgot-password' && (
                <button
                  type="button"
                  onClick={() => switchMode('sign-in')}
                  className="border-none bg-transparent p-0 text-sm text-text-muted hover:text-text"
                >
                  {t('backToSignIn')}
                </button>
              )}
            </form>

            {mode !== 'forgot-password' && (
              <>
                <div className="my-5 flex items-center gap-3 text-text-faint">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs">{t('or')}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-raised"
                >
                  {t('signInWithGoogle')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
