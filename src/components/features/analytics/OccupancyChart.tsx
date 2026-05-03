"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { OccupancyData } from "@/lib/analytics";

type Props = OccupancyData;

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];

// Flatten OccupancyRow for recharts: { label, [propId]: value, ... }
type FlatRow = { label: string } & Record<string, number | string>;

function flattenData(data: OccupancyData["data"]): FlatRow[] {
  return data.map(row => {
    const flat: FlatRow = { label: row.label };
    for (const [k, v] of Object.entries(row.values)) {
      flat[k] = v;
    }
    return flat;
  });
}

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
          <span className="text-gray-500 truncate max-w-[120px]">{p.name} :</span>
          <span className="font-medium text-gray-800">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function OccupancyChart({ data, properties }: Props) {
  if (!properties.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        Aucun bien actif à afficher.
      </div>
    );
  }

  const flat = flattenData(data);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={flat} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E5E7EB" }} />
        <Legend
          formatter={name => (
            <span className="text-xs text-gray-600 truncate max-w-[100px] inline-block">{name}</span>
          )}
        />
        {properties.map((prop, i) => (
          <Line
            key={prop.id}
            type="monotone"
            dataKey={prop.id}
            name={prop.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
