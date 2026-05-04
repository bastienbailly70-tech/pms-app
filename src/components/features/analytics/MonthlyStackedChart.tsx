"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { MonthlyRevenueBar } from "@/lib/analytics";

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const commission = payload.find(p => p.name === "Commission")?.value ?? 0;
  const net = payload.find(p => p.name === "Reversement")?.value ?? 0;
  const gross = commission + net;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2 capitalize">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Brut total</span>
          <span className="font-bold text-gray-800">{fmt(gross)}</span>
        </div>
        <div className="h-px bg-gray-100 my-1" />
        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-400">Notre CA</span>
          </div>
          <span className="font-semibold text-emerald-600">{fmt(commission)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-400">Reversement</span>
          </div>
          <span className="font-semibold text-blue-600">{fmt(net)}</span>
        </div>
      </div>
    </div>
  );
}

export function MonthlyStackedChart({ data }: { data: MonthlyRevenueBar[] }) {
  const hasData = data.some(d => d.gross > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-56 text-sm" style={{ color: "var(--text-tertiary)" }}>
        Aucun revenu à afficher
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)", radius: 6 }} />
        <Legend
          formatter={name => <span style={{ fontSize: 11, color: "#64748b" }}>{name}</span>}
          iconSize={8}
          iconType="circle"
        />
        <Bar dataKey="commission" name="Commission" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
        <Bar dataKey="net" name="Reversement" stackId="a" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
