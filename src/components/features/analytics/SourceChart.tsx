"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { SourcePoint } from "@/lib/analytics";

type Props = {
  data: SourcePoint[];
};

const SOURCE_COLORS: Record<string, string> = {
  AIRBNB: "#FF5A5F",
  BOOKING_COM: "#003580",
  AGODA: "#E31837",
  VRBO: "#3D67FF",
  EXPEDIA: "#FFC72C",
  GOOGLE_VR: "#4285F4",
  MANUAL: "#6B7280",
  OTHER: "#D1D5DB",
};

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: SourcePoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{d.label}</p>
      <p className="text-gray-500">{d.count} réservation{d.count > 1 ? "s" : ""}</p>
      {d.revenue > 0 && <p className="text-gray-500">{fmt(d.revenue)}</p>}
    </div>
  );
}

export function SourceChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Aucune réservation pour cette période.
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map(d => (
                <Cell key={d.source} fill={SOURCE_COLORS[d.source] ?? "#9CA3AF"} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map(d => (
          <div key={d.source} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ background: SOURCE_COLORS[d.source] ?? "#9CA3AF" }}
            />
            <span className="text-xs text-gray-600 flex-1 truncate">{d.label}</span>
            <span className="text-xs font-medium text-gray-800">{d.count}</span>
            <span className="text-xs text-gray-400 w-10 text-right">
              {Math.round((d.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
