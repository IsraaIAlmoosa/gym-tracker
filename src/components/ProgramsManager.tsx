'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startProgram, abandonProgram } from '@/lib/actions/programs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { CalendarIcon } from '@/components/ui/icons';

export type ProgramCardData = {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  isDefault: boolean;
};

export type ActiveProgramData = {
  enrollmentId: string;
  programName: string;
  currentWeek: number;
  durationWeeks: number;
  currentDayName: string;
  completedSessions: number;
};

type Props = {
  activeProgram: ActiveProgramData | null;
  defaultPrograms: ProgramCardData[];
  customPrograms: ProgramCardData[];
};

export default function ProgramsManager({ activeProgram, defaultPrograms, customPrograms }: Props) {
  const t = useTranslations('programs');
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleStart(programId: string) {
    setBusyId(programId);
    setErrorMsg(null);
    const result = await startProgram(programId);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  async function handleAbandon() {
    if (!activeProgram) return;
    if (!window.confirm(t('abandonConfirm'))) return;
    setBusyId(activeProgram.enrollmentId);
    const result = await abandonProgram(activeProgram.enrollmentId);
    setBusyId(null);
    if (result.success) {
      router.refresh();
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  function renderProgramCard(program: ProgramCardData) {
    return (
      <Card key={program.id}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="m-0 text-sm font-semibold text-text">{program.name}</h3>
          <Badge tone="neutral">
            {t('weeksXDays', { weeks: program.durationWeeks, days: program.daysPerWeek })}
          </Badge>
        </div>
        {program.description && (
          <p className="m-0 mb-3 text-xs leading-relaxed text-text-muted">{program.description}</p>
        )}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleStart(program.id)}
            disabled={busyId === program.id}
            className="px-4 py-2 text-xs"
          >
            {busyId === program.id ? t('starting') : t('start')}
          </Button>
          <Button href={`/programs/${program.id}`} variant="ghost" className="px-4 py-2 text-xs">
            {t('viewDetails')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {errorMsg && <p className="m-0 text-sm text-warn">{errorMsg}</p>}

      <section>
        {activeProgram ? (
          <Card title={t('activeProgramTitle')}>
            <p className="m-0 mb-1 text-base font-bold text-text">{activeProgram.programName}</p>
            <p className="m-0 mb-3 text-sm text-text-muted">
              {t('weekOf', { current: activeProgram.currentWeek, total: activeProgram.durationWeeks })}
              {activeProgram.currentDayName ? ` · ${activeProgram.currentDayName}` : ''}
            </p>
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${Math.min(100, (activeProgram.currentWeek / activeProgram.durationWeeks) * 100)}%`,
                }}
              />
            </div>
            <p className="m-0 mb-4 text-xs text-text-faint">
              {t('completedSessions', { n: activeProgram.completedSessions })}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button href={`/workouts/new?program=${activeProgram.enrollmentId}`} className="px-4 py-2 text-xs">
                {t('startTodaysWorkout')}
              </Button>
              <button
                type="button"
                onClick={handleAbandon}
                disabled={busyId === activeProgram.enrollmentId}
                className="border-none bg-transparent p-0 text-xs text-text-faint"
              >
                {t('abandon')}
              </button>
            </div>
          </Card>
        ) : (
          <EmptyState icon={<CalendarIcon color="#737373" size={32} />} message={t('noActiveProgram')} />
        )}
      </section>

      <section>
        <h2 className="m-0 mb-3 text-sm font-semibold text-text-muted">{t('defaultProgramsTitle')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{defaultPrograms.map(renderProgramCard)}</div>
      </section>

      <section>
        <h2 className="m-0 mb-3 text-sm font-semibold text-text-muted">{t('customProgramsTitle')}</h2>
        {customPrograms.length === 0 ? (
          <EmptyState compact message={t('noCustomPrograms')} ctaLabel={t('createCustom')} ctaHref="/programs/new" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{customPrograms.map(renderProgramCard)}</div>
            <Button href="/programs/new" variant="ghost" className="w-fit">
              {t('createCustom')}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
