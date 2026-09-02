'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';

type Point = { date: string; value: number };

type Props = {
  label: string;
  unit: string;
  points: Point[];
  decimals?: number;
};

export default function InBodyTrendChart({ label, unit, points, decimals = 1 }: Props) {
  if (points.length === 0) return null;

  const latest = points[points.length - 1].value;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="text-sm font-bold text-accent">
          {latest.toFixed(decimals)} {unit}
        </span>
      </div>
      <div className="h-24 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #262626',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#A3A3A3' }}
              formatter={(value) => [`${value} ${unit}`, label]}
            />
            <Line
              type="monotone"
              dataKey="value"
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
}
