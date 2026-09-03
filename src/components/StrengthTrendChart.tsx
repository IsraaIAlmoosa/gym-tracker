'use client';

import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { toLocalDateStr, type ExerciseTrend } from '@/lib/analytics';
import type { WeightUnit } from '@/lib/units';
import { kgToDisplayUnit } from '@/lib/units';

type Props = {
  trends: ExerciseTrend[];
  weightUnit: WeightUnit;
  noDataInRangeLabel: string;
};

type TimeframeKey = '7d' | '30d' | '90d' | '1y';

const TIMEFRAMES: { key: TimeframeKey; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
];

export default function StrengthTrendChart({ trends, weightUnit, noDataInRangeLabel }: Props) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('90d');

  const cutoffStr = useMemo(() => {
    const days = TIMEFRAMES.find((tf) => tf.key === timeframe)?.days ?? 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return toLocalDateStr(d);
  }, [timeframe]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 self-end">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            type="button"
            onClick={() => setTimeframe(tf.key)}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              timeframe === tf.key
                ? 'bg-accent text-accent-ink'
                : 'text-text-faint hover:bg-surface-raised hover:text-text-muted'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {trends.map((trend) => {
        const data = trend.points
          .filter((p) => p.date >= cutoffStr)
          .map((p) => ({ date: p.date, weight: kgToDisplayUnit(p.weight, weightUnit) }));

        if (data.length === 0) {
          return (
            <div key={trend.exerciseId}>
              <span className="text-sm font-medium text-text">{trend.exerciseName}</span>
              <p className="m-0 mt-1 text-xs text-text-faint">{noDataInRangeLabel}</p>
            </div>
          );
        }

        const latest = data[data.length - 1].weight;

        return (
          <div key={trend.exerciseId}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium text-text">{trend.exerciseName}</span>
              <span className="text-sm font-bold text-accent">
                {latest} {weightUnit}
              </span>
            </div>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f1f1f',
                      border: '1px solid #262626',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#A3A3A3' }}
                    formatter={(value) => [`${value} ${weightUnit}`, trend.exerciseName]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#C4F82A"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#C4F82A', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
