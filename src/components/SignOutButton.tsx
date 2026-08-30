'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  label: string;
  locale: string;
};

export default function SignOutButton({ label, locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      style={{
        backgroundColor: 'transparent',
        color: '#FFFFFF',
        border: '1px solid #404040',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}
