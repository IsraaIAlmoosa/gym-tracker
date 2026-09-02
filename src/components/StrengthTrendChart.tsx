'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { ExerciseTrend } from '@/lib/analytics';
import type { WeightUnit } from '@/lib/units';
import { kgToDisplayUnit } from '@/lib/units';

type Props = {
  trends: ExerciseTrend[];
  weightUnit: WeightUnit;
};

export default function StrengthTrendChart({ trends, weightUnit }: Props) {
  return (
    <div className="flex flex-col gap-5">
      {trends.map((trend) => {
        const data = trend.points.map((p) => ({
          date: p.date,
          weight: kgToDisplayUnit(p.weight, weightUnit),
        }));
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
