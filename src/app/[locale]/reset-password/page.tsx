'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none'
const LABEL_CLASS = 'mb-1.5 block text-xs text-text-muted'

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const t = useTranslations('resetPasswordPage')

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(data.session !== null)
      setCheckingSession(false)
    })
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError(t('mismatch'))
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push(`/${locale}/dashboard`), 1500)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-lg font-extrabold tracking-tight text-text">GYM TRACKER</span>
        </div>

        {checkingSession ? (
          <p className="text-center text-sm text-text-muted">…</p>
        ) : !hasSession ? (
          <div className="text-center">
            <h1 className="m-0 text-xl font-bold text-text">{t('expiredTitle')}</h1>
            <p className="mt-2 text-sm text-text-muted">{t('expiredSubtitle')}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink no-underline transition-opacity hover:opacity-90"
            >
              {t('backToLogin')}
            </Link>
          </div>
        ) : success ? (
          <p className="text-center text-sm text-good">{t('success')}</p>
        ) : (
          <>
            <h1 className="m-0 text-xl font-bold text-text">{t('title')}</h1>
            <p className="mt-1 text-sm text-text-muted">{t('subtitle')}</p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="new-password">
                  {t('newPasswordPlaceholder')}
                </label>
                <input
                  id="new-password"
                  type="password"
                  placeholder={t('newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="confirm-password">
                  {t('confirmPasswordPlaceholder')}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder={t('confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={INPUT_CLASS}
                />
              </div>

              {error && <p className="m-0 text-sm text-warn">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? t('saving') : t('submit')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
