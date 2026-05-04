"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ForecastWeek } from "@/lib/analytics";

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const gross = payload[0]?.value ?? 0;
  const comm = payload[1]?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[140px]">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Brut</span>
          <span className="font-semibold text-gray-800">{fmt(gross)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Notre CA</span>
          <span className="font-semibold text-emerald-600">{fmt(comm)}</span>
        </div>
      </div>
    </div>
  );
}

export function WeeklyForecastChart({ data }: { data: ForecastWeek[] }) {
  const hasData = data.some(w => w.gross > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--text-tertiary)" }}>
        Aucune réservation sur 30 jours
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barGap={3}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : "0"}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)", radius: 6 }} />
        <Bar dataKey="gross" radius={[5, 5, 0, 0]} maxBarSize={32}>
          {data.map((_, i) => (
            <Cell key={i} fill="#2563eb" fillOpacity={0.15 + (data[i]!.gross > 0 ? 0.75 : 0)} />
          ))}
        </Bar>
        <Bar dataKey="commission" radius={[4, 4, 0, 0]} maxBarSize={32} fill="#059669" fillOpacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  );
}
