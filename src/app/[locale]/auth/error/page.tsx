import { Link } from '@/i18n/navigation'

export default function AuthErrorPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', backgroundColor: '#0A0A0A' }}>
      <p style={{ color: 'white' }}>Login failed. Please try again.</p>
      <Link
        href="/login"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', backgroundColor: 'white', padding: '12px 24px', color: 'black', fontWeight: 500 }}
      >
        Back to login
      </Link>
    </div>
  )
}
