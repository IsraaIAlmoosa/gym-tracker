'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { saveInBodyMeasurement, updateInBodyMeasurement } from '@/lib/actions/inbody';
import { displayUnitToKg, kgToDisplayUnit, type WeightUnit } from '@/lib/units';
import { computeBmi, type InBodyMeasurement, type SegmentalData, type SegmentalPart } from '@/lib/inbody';
import Button from '@/components/ui/Button';

type Props = {
  weightUnit: WeightUnit;
  editing?: InBodyMeasurement | null;
  latestHeightCm?: number | null;
  onSaved?: () => void;
};

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none';
const LABEL_CLASS = 'mb-1.5 block text-xs text-text-muted';

type MassFieldKey = 'weight' | 'skeletalMuscleMass' | 'bodyFatMass' | 'proteinMass' | 'mineralMass';

type PlainFieldKey =
  | 'height'
  | 'bodyFatPercentage'
  | 'bmi'
  | 'bmr'
  | 'bodyWater'
  | 'visceralFat'
  | 'waistHipRatio';

const SEGMENT_KEYS = ['leftArm', 'rightArm', 'trunk', 'leftLeg', 'rightLeg'] as const;
type SegmentKey = (typeof SEGMENT_KEYS)[number];

function toLocalDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numOrEmpty(value: number | null): string {
  return value === null ? '' : String(value);
}

function parseOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function InBodyForm({ weightUnit, editing, latestHeightCm, onSaved }: Props) {
  const t = useTranslations('inbodyForm');
  const tUnits = useTranslations('units');
  const router = useRouter();
  const unitLabel = tUnits(weightUnit);

  const [date, setDate] = useState(() => editing?.measurementDate ?? toLocalDateStr(new Date()));

  const [massValues, setMassValues] = useState<Record<MassFieldKey, string>>(() => {
    function massToDisplay(kg: number | null): string {
      return numOrEmpty(kg !== null ? kgToDisplayUnit(kg, weightUnit) : null);
    }
    return {
      weight: massToDisplay(editing?.weightKg ?? null),
      skeletalMuscleMass: massToDisplay(editing?.skeletalMuscleMassKg ?? null),
      bodyFatMass: massToDisplay(editing?.bodyFatMassKg ?? null),
      proteinMass: massToDisplay(editing?.proteinMassKg ?? null),
      mineralMass: massToDisplay(editing?.mineralMassKg ?? null),
    };
  });

  const [plainValues, setPlainValues] = useState<Record<PlainFieldKey, string>>(() => ({
    height: numOrEmpty(editing?.heightCm ?? latestHeightCm ?? null),
    bodyFatPercentage: numOrEmpty(editing?.bodyFatPercentage ?? null),
    bmi: numOrEmpty(editing?.bmi ?? null),
    bmr: numOrEmpty(editing?.basalMetabolicRateKcal ?? null),
    bodyWater: numOrEmpty(editing?.bodyWaterLiters ?? null),
    visceralFat: numOrEmpty(editing?.visceralFatLevel ?? null),
    waistHipRatio: numOrEmpty(editing?.waistHipRatio ?? null),
  }));

  const [segmental, setSegmental] = useState<Record<SegmentKey, { lean: string; fat: string }>>(() => {
    const initial = {} as Record<SegmentKey, { lean: string; fat: string }>;
    for (const key of SEGMENT_KEYS) {
      const part = editing?.segmentalData?.[key] as SegmentalPart | undefined;
      initial[key] = { lean: numOrEmpty(part?.leanKg ?? null), fat: numOrEmpty(part?.fatKg ?? null) };
    }
    return initial;
  });

  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const heightCmValue = parseOrNull(plainValues.height);
  const weightKgLive =
    parseOrNull(massValues.weight) !== null
      ? displayUnitToKg(parseOrNull(massValues.weight)!, weightUnit)
      : null;
  const liveBmi = computeBmi(weightKgLive, heightCmValue);

  const massFields: { key: MassFieldKey; label: string; unit: string }[] = [
    { key: 'weight', label: t('weight'), unit: unitLabel },
    { key: 'skeletalMuscleMass', label: t('skeletalMuscleMass'), unit: unitLabel },
    { key: 'bodyFatMass', label: t('bodyFatMass'), unit: unitLabel },
    { key: 'proteinMass', label: t('proteinMass'), unit: unitLabel },
    { key: 'mineralMass', label: t('mineralMass'), unit: unitLabel },
  ];

  function updateMass(key: MassFieldKey, value: string) {
    setMassValues((prev) => ({ ...prev, [key]: value }));
  }

  function updatePlain(key: PlainFieldKey, value: string) {
    setPlainValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateSegment(key: SegmentKey, field: 'lean' | 'fat', value: string) {
    setSegmental((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function handleSave() {
    const hasAnyValue =
      Object.values(massValues).some((v) => v.trim() !== '') ||
      Object.values(plainValues).some((v) => v.trim() !== '');
    if (!hasAnyValue) {
      setErrorMsg(t('errorNoValues'));
      return;
    }

    setErrorMsg(null);
    setSaving(true);
    setSavedMsg(false);

    function massToKg(key: MassFieldKey): number | null {
      const parsed = parseOrNull(massValues[key]);
      return parsed !== null ? displayUnitToKg(parsed, weightUnit) : null;
    }

    const weightKg = massToKg('weight');
    const enteredBmi = parseOrNull(plainValues.bmi);
    const bmi = enteredBmi ?? computeBmi(weightKg, heightCmValue);

    let segmentalData: SegmentalData | null = null;
    for (const key of SEGMENT_KEYS) {
      const lean = parseOrNull(segmental[key].lean);
      const fat = parseOrNull(segmental[key].fat);
      if (lean !== null && fat !== null) {
        segmentalData = segmentalData ?? {};
        segmentalData[key] = { leanKg: lean, fatKg: fat };
      }
    }

    const input = {
      measurementDate: date,
      heightCm: heightCmValue,
      weightKg,
      skeletalMuscleMassKg: massToKg('skeletalMuscleMass'),
      bodyFatPercentage: parseOrNull(plainValues.bodyFatPercentage),
      bodyFatMassKg: massToKg('bodyFatMass'),
      bmi,
      basalMetabolicRateKcal: parseOrNull(plainValues.bmr),
      bodyWaterLiters: parseOrNull(plainValues.bodyWater),
      visceralFatLevel: parseOrNull(plainValues.visceralFat),
      waistHipRatio: parseOrNull(plainValues.waistHipRatio),
      proteinMassKg: massToKg('proteinMass'),
      mineralMassKg: massToKg('mineralMass'),
      segmentalData,
      notes: notes.trim() || null,
    };

    const result = editing
      ? await updateInBodyMeasurement(editing.id, input)
      : await saveInBodyMeasurement(input);

    setSaving(false);

    if (result.success) {
      setSavedMsg(true);
      router.refresh();
      if (editing) {
        if (onSaved) {
          onSaved();
        } else {
          router.push('/inbody/history');
        }
      } else {
        router.push('/inbody');
      }
    } else {
      setErrorMsg(t('errorGeneric'));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL_CLASS} htmlFor="inbody-date">
          {t('date')}
        </label>
        <input
          id="inbody-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${INPUT_CLASS} [color-scheme:dark]`}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="inbody-height">
          {t('height')}
        </label>
        <input
          id="inbody-height"
          type="number"
          inputMode="decimal"
          step="0.1"
          value={plainValues.height}
          onChange={(e) => updatePlain('height', e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {massFields.map((f) => (
          <div key={f.key}>
            <label className={LABEL_CLASS} htmlFor={`inbody-${f.key}`}>
              {f.label} ({f.unit})
            </label>
            <input
              id={`inbody-${f.key}`}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={massValues[f.key]}
              onChange={(e) => updateMass(f.key, e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        ))}

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-bodyfat">
            {t('bodyFatPercentage')} (%)
          </label>
          <input
            id="inbody-bodyfat"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={plainValues.bodyFatPercentage}
            onChange={(e) => updatePlain('bodyFatPercentage', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-bmi">
            {t('bmi')}
          </label>
          <input
            id="inbody-bmi"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={plainValues.bmi}
            onChange={(e) => updatePlain('bmi', e.target.value)}
            placeholder={liveBmi !== null ? String(liveBmi) : undefined}
            className={INPUT_CLASS}
          />
          {plainValues.bmi.trim() === '' && liveBmi !== null && (
            <p className="mt-1 text-[11px] text-text-faint">{t('bmiAutoHint', { value: liveBmi })}</p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-bmr">
            {t('bmr')}
          </label>
          <input
            id="inbody-bmr"
            type="number"
            inputMode="numeric"
            step="1"
            value={plainValues.bmr}
            onChange={(e) => updatePlain('bmr', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-water">
            {t('bodyWater')} (L)
          </label>
          <input
            id="inbody-water"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={plainValues.bodyWater}
            onChange={(e) => updatePlain('bodyWater', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-visceral">
            {t('visceralFat')}
          </label>
          <input
            id="inbody-visceral"
            type="number"
            inputMode="decimal"
            step="1"
            value={plainValues.visceralFat}
            onChange={(e) => updatePlain('visceralFat', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="inbody-whr">
            {t('waistHipRatio')}
          </label>
          <input
            id="inbody-whr"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={plainValues.waistHipRatio}
            onChange={(e) => updatePlain('waistHipRatio', e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="inbody-notes">
          {t('notes')}
        </label>
        <input
          id="inbody-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-text">
          {t('segmentalTitle')}
        </summary>
        <div className="flex flex-col gap-3 border-t border-border p-4">
          <p className="m-0 text-xs text-text-faint">{t('segmentalHint')}</p>
          {SEGMENT_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-3 items-end gap-3">
              <span className="text-sm text-text-muted">{t(`segments.${key}`)}</span>
              <div>
                <label className={LABEL_CLASS} htmlFor={`inbody-seg-${key}-lean`}>
                  {t('leanMass')} (kg)
                </label>
                <input
                  id={`inbody-seg-${key}-lean`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={segmental[key].lean}
                  onChange={(e) => updateSegment(key, 'lean', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor={`inbody-seg-${key}-fat`}>
                  {t('fatMass')} (kg)
                </label>
                <input
                  id={`inbody-seg-${key}-fat`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={segmental[key].fat}
                  onChange={(e) => updateSegment(key, 'fat', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          ))}
        </div>
      </details>

      {errorMsg && <p className="m-0 text-sm text-warn">{errorMsg}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? t('saving') : savedMsg ? t('saved') : editing ? t('update') : t('save')}
        </Button>
        {editing && (
          <button
            type="button"
            onClick={() => onSaved?.()}
            className="border-none bg-transparent p-0 text-sm text-text-muted"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
