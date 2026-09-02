import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { CategoryIcon, getExerciseCategory } from '@/lib/categories';

export type LibraryExercise = {
  id: string;
  nameAr: string;
  nameEn: string;
  muscleGroup: string | null;
  equipment: string | null;
  impactLevel: number | null;
};

type Props = {
  exercise: LibraryExercise;
  isArabic: boolean;
};

const IMPACT_COLOR: Record<number, string> = {
  1: '#4ADE80',
  2: '#FBBF24',
  3: '#F87171',
};

const IMPACT_KEY: Record<number, 'low' | 'medium' | 'high'> = { 1: 'low', 2: 'medium', 3: 'high' };

export default function ExerciseCard({ exercise, isArabic }: Props) {
  const t = useTranslations('workoutBuilder');
  const category = getExerciseCategory(exercise.nameEn);
  const name = isArabic ? exercise.nameAr : exercise.nameEn;

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <CategoryIcon slug={category} color="#C4F82A" />
        <span className="text-sm font-semibold text-text">{name}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {exercise.muscleGroup && <Badge tone="neutral">{exercise.muscleGroup}</Badge>}
        {exercise.equipment && <Badge tone="neutral">{exercise.equipment}</Badge>}
        {exercise.impactLevel !== null && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${IMPACT_COLOR[exercise.impactLevel]}26`, color: IMPACT_COLOR[exercise.impactLevel] }}
          >
            {t(`impact.${IMPACT_KEY[exercise.impactLevel] ?? 'medium'}`)}
          </span>
        )}
      </div>
    </Card>
  );
}
