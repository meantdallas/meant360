'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlySummary } from '@/types';

interface MonthlyChartProps {
  data: MonthlySummary[];
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
              }
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="sponsorship" name="Sponsorship" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
