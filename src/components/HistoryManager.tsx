'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { deleteWorkoutSession } from '@/lib/actions/workouts';
import { deleteActivitySession, type ActivityType } from '@/lib/actions/activities';
import { kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import ActivityForm from '@/components/ActivityForm';

export type SessionRow = {
  id: string;
  date: string;
  duration: number | null;
  created_at: string;
};

export type ExerciseSets = {
  name: string;
  sets: { setNumber: number; weight: number; reps: number }[];
};

export type ActivityRow = {
  id: string;
  activity_type: ActivityType;
  custom_activity_name: string | null;
  duration_minutes: number;
  session_date: string;
  notes: string | null;
};

export type DateGroup = {
  date: string;
  sessions: { session: SessionRow; exercises: ExerciseSets[] }[];
  activities: ActivityRow[];
};

type Props = {
  groups: DateGroup[];
  weightUnit: WeightUnit;
  hasFilter: boolean;
};

export default function HistoryManager({ groups, weightUnit, hasFilter }: Props) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const t = useTranslations('history');
  const tUnits = useTranslations('units');
  const tActivityTypes = useTranslations('activityTypes');
  const router = useRouter();
  const unitLabel = tUnits(weightUnit);

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});

  function formatDateHeading(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isArabic ? 'ar' : 'en', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function handleDeleteSession(id: string) {
    if (!window.confirm(t('deleteSessionConfirm'))) return;
    setBusyId(id);
    const result = await deleteWorkoutSession(id);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [id]: t('deleteError') }));
    }
  }

  async function handleDeleteActivity(id: string) {
    if (!window.confirm(t('deleteActivityConfirm'))) return;
    setBusyId(id);
    const result = await deleteActivitySession(id);
    setBusyId(null);
    if (result.success) {
      if (editingActivityId === id) setEditingActivityId(null);
      router.refresh();
    } else {
      setErrorMsg((prev) => ({ ...prev, [id]: t('deleteError') }));
    }
  }

  if (groups.length === 0) {
    return (
      <p style={{ color: '#A3A3A3', fontSize: '14px' }}>
        {hasFilter ? t('noSessionsInRange') : t('noSessions')}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {groups.map((group) => (
        <div key={group.date}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#C4F82A',
              margin: '0 0 10px',
            }}
          >
            {formatDateHeading(group.date)}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {group.sessions.map(({ session, exercises }) => {
              const totalSets = exercises.reduce((sum, e) => sum + e.sets.length, 0);
              return (
                <div
                  key={session.id}
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderRadius: '12px',
                    padding: '16px 20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: '#A3A3A3',
                      marginBottom: '12px',
                    }}
                  >
                    <span>
                      {totalSets} {t('setsLabel')}
                      {session.duration ? ` · ${session.duration} ${t('minutesLabel')}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <a
                        href={`/${locale}/workouts/${session.id}/edit`}
                        style={{
                          color: '#C4F82A',
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        {t('edit')}
                      </a>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={busyId === session.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#F87171',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                  {errorMsg[session.id] && (
                    <p style={{ color: '#F87171', fontSize: '13px', margin: '0 0 10px' }}>
                      {errorMsg[session.id]}
                    </p>
                  )}
                  {exercises.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {exercises.map((ex) => (
                        <div key={ex.name}>
                          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                            {ex.name}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                              fontSize: '13px',
                              color: '#D4D4D4',
                            }}
                          >
                            {ex.sets.map((s) => (
                              <span
                                key={s.setNumber}
                                style={{
                                  backgroundColor: '#0A0A0A',
                                  border: '1px solid #262626',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                }}
                              >
                                {kgToDisplayUnit(s.weight, weightUnit)} {unitLabel} × {s.reps}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {group.activities.map((activity) => {
              const isEditing = editingActivityId === activity.id;
              return (
                <div
                  key={activity.id}
                  style={{
                    backgroundColor: '#171717',
                    border: '1px solid #262626',
                    borderInlineStart: '3px solid #60A5FA',
                    borderRadius: '12px',
                    padding: '16px 20px',
                  }}
                >
                  {isEditing ? (
                    <ActivityForm
                      key={activity.id}
                      editing={{
                        id: activity.id,
                        activityType: activity.activity_type,
                        customActivityName: activity.custom_activity_name,
                        durationMinutes: activity.duration_minutes,
                        sessionDate: activity.session_date,
                        notes: activity.notes,
                      }}
                      onSaved={() => setEditingActivityId(null)}
                    />
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '14px',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {activity.activity_type === 'other'
                            ? activity.custom_activity_name
                            : tActivityTypes(activity.activity_type)}
                        </span>
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#A3A3A3' }}>
                            {activity.duration_minutes} {t('minutesLabel')}
                          </span>
                          <button
                            onClick={() => setEditingActivityId(activity.id)}
                            disabled={busyId === activity.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#C4F82A',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            disabled={busyId === activity.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#F87171',
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                      {errorMsg[activity.id] && (
                        <p style={{ color: '#F87171', fontSize: '13px', margin: '8px 0 0' }}>
                          {errorMsg[activity.id]}
                        </p>
                      )}
                      {activity.notes && (
                        <p style={{ fontSize: '13px', color: '#D4D4D4', margin: '8px 0 0' }}>
                          {activity.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
