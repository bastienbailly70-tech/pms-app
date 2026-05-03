"use client";

import { useState } from "react";
import Link from "next/link";
import type { FutureRevenue } from "@/lib/analytics";

type Props = { data: FutureRevenue };

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function FutureRevenueTable({ data }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([data.byMonth[0]?.month ?? ""]));
  const commPct = Math.round(data.commissionRate * 100);

  function toggle(month: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  if (data.byMonth.length === 0) {
    return (
      <div
        className="rounded-2xl px-6 py-10 text-center"
        style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Aucune réservation confirmée à venir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.byMonth.map(month => {
        const open = expanded.has(month.month);
        return (
          <div
            key={month.month}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Month header — always visible */}
            <button
              type="button"
              onClick={() => toggle(month.month)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors"
              style={{
                background: open ? "var(--brand-light)" : "var(--surface)",
                borderBottom: open ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: open ? "var(--brand)" : "var(--bg)", color: open ? "#fff" : "var(--text-secondary)" }}
                >
                  {month.bookings}
                </span>
                <span className="font-semibold text-sm capitalize" style={{ color: "var(--text-primary)" }}>
                  {month.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {month.bookings} réservation{month.bookings > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center gap-5 shrink-0">
                <div className="hidden sm:flex items-center gap-4 text-xs">
                  <span style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Brut </span>
                    <span className="font-semibold">{fmt(month.gross)}</span>
                  </span>
                  <span style={{ color: "#d97706" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Comm. </span>
                    <span className="font-semibold">−{fmt(month.commission)}</span>
                  </span>
                  <span style={{ color: "#059669" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>Net </span>
                    <span className="font-bold text-sm">{fmt(month.net)}</span>
                  </span>
                </div>
                {/* Mobile: just the net */}
                <span className="sm:hidden font-bold text-sm" style={{ color: "#059669" }}>
                  {fmt(month.net)}
                </span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 18, lineHeight: 1 }}>
                  {open ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {/* Booking rows */}
            {open && (
              <div>
                <div
                  className="grid text-xs font-semibold px-5 py-2"
                  style={{
                    gridTemplateColumns: "1fr 120px 80px 80px 80px 80px",
                    color: "var(--text-tertiary)",
                    background: "var(--bg)",
                    borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <span>Voyageur · Bien</span>
                  <span>Arrivée → Départ</span>
                  <span className="text-right">Nuits</span>
                  <span className="text-right">Brut</span>
                  <span className="text-right">Comm.</span>
                  <span className="text-right">Net</span>
                </div>

                {month.items.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/bookings/${item.id}`}
                    className="grid items-center px-5 py-3 text-sm transition-colors hover:bg-[var(--bg)]"
                    style={{
                      gridTemplateColumns: "1fr 120px 80px 80px 80px 80px",
                      borderTop: i === 0 ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.guestName ?? <span style={{ color: "var(--text-tertiary)" }}>Sans nom</span>}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                        {item.propertyName}
                      </p>
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {new Date(item.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(item.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </div>
                    <p className="text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {item.nights}n
                    </p>
                    <p className="text-right font-medium" style={{ color: "var(--text-secondary)" }}>
                      {item.gross > 0 ? fmt(item.gross) : "—"}
                    </p>
                    <p className="text-right text-xs" style={{ color: "#d97706" }}>
                      {item.commission > 0 ? `−${fmt(item.commission)}` : "—"}
                    </p>
                    <p className="text-right font-bold" style={{ color: item.net > 0 ? "#059669" : "var(--text-tertiary)" }}>
                      {item.net > 0 ? fmt(item.net) : "—"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Total row */}
      <div
        className="rounded-2xl px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)", border: "1px solid #c7d2fe" }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: "var(--brand)" }}>
            Total · {data.byMonth.reduce((s, m) => s + m.bookings, 0)} réservations futures
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#6366f1" }}>
            Commission {commPct}% incluse
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="hidden sm:block text-right">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Brut</p>
            <p className="font-semibold" style={{ color: "var(--text-secondary)" }}>{fmt(data.totalGross)}</p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Commission</p>
            <p className="font-semibold" style={{ color: "#d97706" }}>−{fmt(data.totalCommission)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Net attendu</p>
            <p className="text-xl font-bold" style={{ color: "var(--brand)" }}>{fmt(data.totalNet)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
