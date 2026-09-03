'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveProfileName } from '@/lib/actions/profile';

type Props = {
  initialFirstName: string | null;
  initialLastName: string | null;
};

const ACCENT = '#C4F82A';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

export default function ProfileNameForm({ initialFirstName, initialLastName }: Props) {
  const t = useTranslations('genderSettingsForm');
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName ?? '');
  const [lastName, setLastName] = useState(initialLastName ?? '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);
    const result = await saveProfileName({
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
    });
    setSaving(false);
    if (result.success) {
      setSavedMsg(true);
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#0A0A0A',
    color: '#FFFFFF',
    border: `1px solid ${CARD_BORDER}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
  } as const;

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
            {t('firstNameLabel')}
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('firstNamePlaceholder')}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
            {t('lastNameLabel')}
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('lastNamePlaceholder')}
            style={inputStyle}
          />
        </div>
      </div>

      {errorMsg && <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 12px' }}>{errorMsg}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          backgroundColor: ACCENT,
          color: '#0A0A0A',
          fontWeight: 700,
          border: 'none',
          borderRadius: '10px',
          padding: '12px 24px',
          fontSize: '14px',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? t('saving') : savedMsg ? t('saved') : t('save')}
      </button>
    </div>
  );
}
