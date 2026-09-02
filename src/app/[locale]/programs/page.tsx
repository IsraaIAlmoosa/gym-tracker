import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import ProgramsManager, { type ProgramCardData, type ActiveProgramData } from '@/components/ProgramsManager';
import {
  mapProgramRow,
  mapProgramDayRow,
  resolveProgramName,
  resolveProgramDescription,
  resolveProgramDayName,
  type ProgramRow,
  type ProgramDayRow,
} from '@/lib/programs';

type Props = {
  params: Promise<{ locale: string }>;
};

type EnrollmentRow = {
  id: string;
  program_id: string;
  current_week: number;
  current_day_index: number;
  programs: ProgramRow | ProgramRow[] | null;
};

function resolveOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toCardData(row: ProgramRow, isArabic: boolean): ProgramCardData {
  const program = mapProgramRow(row);
  return {
    id: program.id,
    name: resolveProgramName(program, isArabic),
    description: resolveProgramDescription(program, isArabic),
    durationWeeks: program.durationWeeks,
    daysPerWeek: program.daysPerWeek,
    isDefault: program.isDefault,
  };
}

export default async function ProgramsPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'programs' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [
    { data: enrollmentRows, error: enrollmentError },
    { data: defaultProgramsRaw, error: defaultProgramsError },
    { data: customProgramsRaw, error: customProgramsError },
  ] = await Promise.all([
    supabase
      .from('program_enrollments')
      .select(
        'id, program_id, current_week, current_day_index, programs(id, is_default, created_by_user_id, slug, category, name, name_ar, name_en, description, description_ar, description_en, duration_weeks, days_per_week)'
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('programs')
      .select(
        'id, is_default, created_by_user_id, slug, category, name, name_ar, name_en, description, description_ar, description_en, duration_weeks, days_per_week'
      )
      .eq('is_default', true)
      .order('category'),
    supabase
      .from('programs')
      .select(
        'id, is_default, created_by_user_id, slug, category, name, name_ar, name_en, description, description_ar, description_en, duration_weeks, days_per_week'
      )
      .eq('is_default', false)
      .order('created_at', { ascending: false }),
  ]);

  if (enrollmentError || defaultProgramsError || customProgramsError) {
    return <LoadErrorNotice locale={locale} />;
  }

  const enrollmentRaw = ((enrollmentRows ?? []) as unknown as EnrollmentRow[])[0] ?? null;

  let activeProgram: ActiveProgramData | null = null;

  if (enrollmentRaw) {
    const program = resolveOne(enrollmentRaw.programs);

    const [{ data: currentDayRaw }, { count: completedSessions }] = await Promise.all([
      supabase
        .from('program_days')
        .select('id, program_id, day_index, name, name_ar, name_en')
        .eq('program_id', enrollmentRaw.program_id)
        .eq('day_index', enrollmentRaw.current_day_index)
        .maybeSingle(),
      supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('program_enrollment_id', enrollmentRaw.id),
    ]);

    if (program) {
      const mappedProgram = mapProgramRow(program);
      const currentDay = currentDayRaw ? mapProgramDayRow(currentDayRaw as ProgramDayRow) : null;

      activeProgram = {
        enrollmentId: enrollmentRaw.id,
        programName: resolveProgramName(mappedProgram, isArabic),
        currentWeek: enrollmentRaw.current_week,
        durationWeeks: mappedProgram.durationWeeks,
        currentDayName: currentDay
          ? resolveProgramDayName(currentDay, isArabic, mappedProgram.isDefault)
          : '',
        completedSessions: completedSessions ?? 0,
      };
    }
  }

  const defaultPrograms = ((defaultProgramsRaw ?? []) as unknown as ProgramRow[]).map((row) =>
    toCardData(row, isArabic)
  );
  const customPrograms = ((customProgramsRaw ?? []) as unknown as ProgramRow[]).map((row) =>
    toCardData(row, isArabic)
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <h1 className="m-0 mb-1 text-2xl font-bold text-text lg:text-3xl">{t('title')}</h1>
      <p className="m-0 mb-6 text-[15px] text-text-muted">{t('intro')}</p>

      <ProgramsManager
        activeProgram={activeProgram}
        defaultPrograms={defaultPrograms}
        customPrograms={customPrograms}
      />
    </div>
  );
}
