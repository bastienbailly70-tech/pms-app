"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { MonthlyRevenuePoint } from "@/lib/analytics";

type Props = {
  data: MonthlyRevenuePoint[];
};

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name} :</span>
          <span className="font-medium text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: Props) {
  const hasData = data.some(d => d.current > 0 || d.previous > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Aucun revenu à afficher pour cette période.
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => `${(v / 1000).toFixed(0)}k€`}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB" }} />
        <Legend
          formatter={name => (
            <span className="text-xs text-gray-600">{name}</span>
          )}
        />
        <Bar dataKey="previous" name={String(currentYear - 1)} fill="#E5E7EB" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="current" name={String(currentYear)} fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
