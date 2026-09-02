'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CATEGORIES, CategoryIcon, getExerciseCategory, type CategorySlug } from '@/lib/categories';
import ExerciseCard, { type LibraryExercise } from '@/components/ExerciseCard';
import EmptyState from '@/components/ui/EmptyState';

type Props = {
  exercises: LibraryExercise[];
  isArabic: boolean;
};

const IMPACT_LEVELS = [1, 2, 3] as const;
const IMPACT_KEY: Record<number, 'low' | 'medium' | 'high'> = { 1: 'low', 2: 'medium', 3: 'high' };

const SELECT_CLASS =
  'rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none';

export default function ExerciseLibrary({ exercises, isArabic }: Props) {
  const t = useTranslations('exercises');
  const tImpact = useTranslations('workoutBuilder');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategorySlug | 'all'>('all');
  const [equipment, setEquipment] = useState<string>('all');
  const [impact, setImpact] = useState<string>('all');

  const equipmentOptions = useMemo(() => {
    const set = new Set(exercises.map((e) => e.equipment).filter((e): e is string => Boolean(e)));
    return Array.from(set).sort();
  }, [exercises]);

  const filtered = exercises.filter((ex) => {
    const name = isArabic ? ex.nameAr : ex.nameEn;
    if (search.trim() !== '' && !name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (category !== 'all' && getExerciseCategory(ex.nameEn) !== category) return false;
    if (equipment !== 'all' && ex.equipment !== equipment) return false;
    if (impact !== 'all' && String(ex.impactLevel ?? '') !== impact) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            category === 'all' ? 'bg-accent text-accent-ink' : 'bg-surface-raised text-text-muted'
          }`}
        >
          {t('allMuscleGroups')}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategory(c.slug)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              category === c.slug ? 'bg-accent text-accent-ink' : 'bg-surface-raised text-text-muted'
            }`}
          >
            <CategoryIcon slug={c.slug} color={category === c.slug ? '#0A0A0A' : '#8B95A5'} />
            {isArabic ? c.ar : c.en}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={SELECT_CLASS}>
          <option value="all">{t('allEquipment')}</option>
          {equipmentOptions.map((eq) => (
            <option key={eq} value={eq}>
              {eq}
            </option>
          ))}
        </select>

        <select value={impact} onChange={(e) => setImpact(e.target.value)} className={SELECT_CLASS}>
          <option value="all">{t('allImpactLevels')}</option>
          {IMPACT_LEVELS.map((level) => (
            <option key={level} value={level}>
              {tImpact(`impact.${IMPACT_KEY[level]}`)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={t('noResults')} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} isArabic={isArabic} />
          ))}
        </div>
      )}
    </div>
  );
}
