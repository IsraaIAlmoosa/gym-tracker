'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Button from './ui/Button';

type Props = {
  label: string;
  locale: string;
  className?: string;
};

export default function SignOutButton({ label, locale, className = 'px-4 py-2 text-xs' }: Props) {
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
    <Button onClick={handleSignOut} disabled={loading} variant="ghost" className={className}>
      {loading ? '...' : label}
    </Button>
  );
}
