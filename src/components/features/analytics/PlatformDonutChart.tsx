"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { SourcePoint } from "@/lib/analytics";

const COLORS: Record<string, string> = {
  AIRBNB: "#FF385C",
  BOOKING_COM: "#003580",
  AGODA: "#E31837",
  VRBO: "#3D67FF",
  EXPEDIA: "#FFC72C",
  MANUAL: "#6366f1",
  OTHER: "#94a3b8",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: SourcePoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]!.payload;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[150px]">
      <p className="font-bold text-gray-700 mb-2">{d.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Réservations</span>
          <span className="font-semibold">{d.count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Revenus</span>
          <span className="font-semibold">{fmt(d.revenue)}</span>
        </div>
      </div>
    </div>
  );
}

export function PlatformDonutChart({ data }: { data: SourcePoint[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--text-tertiary)" }}>
        Aucune donnée
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.source} fill={COLORS[d.source] ?? "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        {data.map(d => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.source} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: COLORS[d.source] ?? "#94a3b8" }}
              />
              <span className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)" }}>
                {d.label}
              </span>
              <span className="text-xs font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
                {pct}%
              </span>
              <span className="text-xs shrink-0 w-6 text-right" style={{ color: "var(--text-tertiary)" }}>
                {d.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
