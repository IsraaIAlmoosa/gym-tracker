import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import LoadErrorNotice from '@/components/LoadErrorNotice';
import ProgramBuilder from '@/components/ProgramBuilder';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewProgramPage({ params }: Props) {
  const { locale } = await params;
  const isArabic = locale === 'ar';
  const t = await getTranslations({ locale, namespace: 'programBuilder' });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: allExercisesRaw, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name_ar, name_en')
    .order(isArabic ? 'name_ar' : 'name_en');

  if (exercisesError) {
    return <LoadErrorNotice locale={locale} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
      <a href={`/${locale}/programs`} className="text-sm text-text-muted no-underline">
        {t('back')}
      </a>
      <h1 className="m-0 mt-2 mb-6 text-2xl font-bold text-text lg:text-3xl">{t('title')}</h1>

      <ProgramBuilder allExercises={allExercisesRaw ?? []} />
    </div>
  );
}
