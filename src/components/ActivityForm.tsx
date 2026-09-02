'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  saveActivitySession,
  updateActivitySession,
  type ActivityType,
} from '@/lib/actions/activities';

export type EditingActivity = {
  id: string;
  activityType: ActivityType;
  customActivityName: string | null;
  durationMinutes: number;
  sessionDate: string;
  notes: string | null;
};

type Props = {
  editing?: EditingActivity | null;
  onSaved?: () => void;
};

const ACCENT = '#C4F82A';
const CARD_BORDER = '#262626';
const MUTED = '#737373';

const ACTIVITY_TYPES: ActivityType[] = ['yoga', 'pilates', 'tai_chi', 'walking', 'other'];

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ActivityForm({ editing, onSaved }: Props) {
  const t = useTranslations('activityForm');
  const tTypes = useTranslations('activityTypes');
  const router = useRouter();

  const [date, setDate] = useState(() => editing?.sessionDate ?? toLocalDateStr(new Date()));
  const [activityType, setActivityType] = useState<ActivityType>(editing?.activityType ?? 'yoga');
  const [customActivityName, setCustomActivityName] = useState(
    editing?.customActivityName ?? ''
  );
  const [duration, setDuration] = useState(() =>
    editing ? String(editing.durationMinutes) : ''
  );
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const isOther = activityType === 'other';

  async function handleSave() {
    if (isOther && customActivityName.trim() === '') {
      setErrorMsg(t('errorCustomName'));
      return;
    }

    const parsedDuration = parseInt(duration, 10);
    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      setErrorMsg(t('errorDuration'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);

    const input = {
      activityType,
      customActivityName: isOther ? customActivityName.trim() : null,
      durationMinutes: parsedDuration,
      sessionDate: date,
      notes: notes.trim() || null,
    };

    const result = editing
      ? await updateActivitySession(editing.id, input)
      : await saveActivitySession(input);

    setSaving(false);

    if (result.success) {
      setSavedMsg(true);
      router.refresh();
      if (editing) {
        onSaved?.();
      } else {
        setDuration('');
        setNotes('');
        setCustomActivityName('');
      }
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t('date')}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            colorScheme: 'dark',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t('activityType')}
        </label>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value as ActivityType)}
          style={{
            width: '100%',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            colorScheme: 'dark',
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: '8px',
            padding: '10px 12px',
            fontSize: '14px',
          }}
        >
          {ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {tTypes(type)}
            </option>
          ))}
        </select>
      </div>

      {isOther && (
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
            {t('customActivityName')}
          </label>
          <input
            type="text"
            value={customActivityName}
            onChange={(e) => setCustomActivityName(e.target.value)}
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
      )}

      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t('duration')}
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
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

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', color: MUTED, marginBottom: '6px' }}>
          {t('notes')}
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: ACCENT,
            color: '#0A0A0A',
            fontWeight: 700,
            border: 'none',
            borderRadius: '10px',
            padding: '12px 28px',
            fontSize: '14px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? t('saving') : savedMsg ? t('saved') : editing ? t('update') : t('save')}
        </button>
        {editing && (
          <button
            onClick={() => onSaved?.()}
            style={{
              background: 'none',
              border: 'none',
              color: MUTED,
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
