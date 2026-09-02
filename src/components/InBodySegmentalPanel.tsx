import { useTranslations } from 'next-intl';
import type { SegmentalData, SegmentalPart } from '@/lib/inbody';

type Props = {
  segmentalData: SegmentalData;
};

const SEGMENT_KEYS = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg'] as const;

export default function InBodySegmentalPanel({ segmentalData }: Props) {
  const t = useTranslations('inbody');

  const entries: { key: (typeof SEGMENT_KEYS)[number]; part: SegmentalPart }[] = [];
  for (const key of SEGMENT_KEYS) {
    const part = segmentalData[key];
    if (part) entries.push({ key, part });
  }

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {entries.map(({ key, part }) => (
        <div key={key} className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 text-xs font-medium text-text-muted">{t(`segments.${key}`)}</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-text-faint">{t('leanMass')}</span>
              <span className="text-sm font-bold text-text">{part.leanKg.toFixed(1)} kg</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-text-faint">{t('fatMass')}</span>
              <span className="text-sm font-bold text-text">{part.fatKg.toFixed(1)} kg</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
