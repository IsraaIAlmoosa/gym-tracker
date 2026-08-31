'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type Mode = 'sign-in' | 'sign-up'

export default function LoginPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const t = useTranslations('login')

  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
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

    if (mode === 'sign-up') {
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
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
      } else {
        router.push(`/${locale}/dashboard`)
      }
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', backgroundColor: '#0A0A0A' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              color: mode === 'sign-in' ? 'white' : '#777',
              borderBottom: mode === 'sign-in' ? '2px solid white' : '2px solid transparent',
              fontWeight: 500,
            }}
          >
            {t('signInTab')}
          </button>
          <button
            type="button"
            onClick={() => setMode('sign-up')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'transparent',
              color: mode === 'sign-up' ? 'white' : '#777',
              borderBottom: mode === 'sign-up' ? '2px solid white' : '2px solid transparent',
              fontWeight: 500,
            }}
          >
            {t('signUpTab')}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1A1A1A', color: 'white' }}
          />
          <input
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#1A1A1A', color: 'white' }}
          />

          {error && <p style={{ color: '#f87171', fontSize: '14px' }}>{error}</p>}
          {message && <p style={{ color: '#4ade80', fontSize: '14px' }}>{message}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ borderRadius: '8px', backgroundColor: 'white', padding: '12px 24px', color: 'black', fontWeight: 500, opacity: loading ? 0.6 : 1 }}
          >
            {mode === 'sign-up' ? t('createAccount') : t('signIn')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#555' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }} />
          <span style={{ fontSize: '12px' }}>{t('or')}</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#333' }} />
        </div>

        <button
          onClick={handleGoogleLogin}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px', backgroundColor: 'white', padding: '12px 24px', color: 'black', fontWeight: 500 }}
        >
          {t('signInWithGoogle')}
        </button>
      </div>
    </div>
  )
}
