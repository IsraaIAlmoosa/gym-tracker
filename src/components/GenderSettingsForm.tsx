'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfileInfo } from '@/lib/actions/profile';

type Props = {
  locale: string;
  initialGender: 'male' | 'female' | null;
  initialAge: number | null;
};

const ACCENT = '#C4F82A';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

export default function GenderSettingsForm({ locale, initialGender, initialAge }: Props) {
  const isArabic = locale === 'ar';
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(initialGender);
  const [ageInput, setAgeInput] = useState<string>(initialAge ? String(initialAge) : '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = {
    male: isArabic ? 'ذكر' : 'Male',
    female: isArabic ? 'أنثى' : 'Female',
    ageLabel: isArabic ? 'العمر' : 'Age',
    save: isArabic ? 'حفظ' : 'Save',
    saving: isArabic ? 'جارٍ الحفظ...' : 'Saving...',
    saved: isArabic ? 'تم الحفظ ✓' : 'Saved ✓',
    errorAge: isArabic ? 'أدخل عمر صحيح بين 13 و100' : 'Enter a valid age between 13 and 100',
    errorGeneric: isArabic ? 'صار خطأ، حاول مرة ثانية' : 'Something went wrong, try again',
  };

  const canSave = selectedGender !== null;

  async function handleSave() {
    if (!selectedGender) return;

    let age: number | null = null;
    if (ageInput.trim() !== '') {
      const parsed = parseInt(ageInput, 10);
      if (Number.isNaN(parsed) || parsed < 13 || parsed > 100) {
        setErrorMsg(t.errorAge);
        return;
      }
      age = parsed;
    }

    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);
    const result = await saveProfileInfo({ gender: selectedGender, age });
    setSaving(false);
    if (result.success) {
      setSavedMsg(true);
      router.refresh();
    } else {
      setErrorMsg(t.errorGeneric);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        {(['male', 'female'] as const).map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGender(g)}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '10px',
              border: `2px solid ${selectedGender === g ? ACCENT : CARD_BORDER}`,
              backgroundColor: selectedGender === g ? 'rgba(196, 248, 42, 0.1)' : 'transparent',
              color: selectedGender === g ? ACCENT : '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {g === 'male' ? t.male : t.female}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: MUTED,
            marginBottom: '6px',
          }}
        >
          {t.ageLabel}
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={13}
          max={100}
          value={ageInput}
          onChange={(e) => setAgeInput(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 12px' }}>{errorMsg}</p>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        style={{
          backgroundColor: canSave ? ACCENT : '#262626',
          color: canSave ? '#0A0A0A' : MUTED,
          fontWeight: 700,
          border: 'none',
          borderRadius: '10px',
          padding: '12px 24px',
          fontSize: '14px',
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}
      >
        {saving ? t.saving : savedMsg ? t.saved : t.save}
      </button>
    </div>
  );
}
