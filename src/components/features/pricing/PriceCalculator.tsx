"use client";

import { useState } from "react";
import { calculatePrice } from "@/lib/pricing";
import type { PricingRuleModel, RatePlanModel } from "@/generated/prisma/models";

type Props = {
  rules: PricingRuleModel[];
  ratePlans: RatePlanModel[];
  maxGuests: number;
};

export function PriceCalculator({ rules, ratePlans, maxGuests }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);
  const [planId, setPlanId] = useState("");

  const plan = ratePlans.find(p => p.id === planId) ?? null;

  let breakdown = null;
  let calcError = "";
  try {
    if (checkIn && checkOut && checkIn < checkOut) {
      breakdown = calculatePrice(new Date(checkIn), new Date(checkOut), guests, maxGuests, rules, plan);
    }
  } catch (e) {
    calcError = (e as Error).message;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: breakdown?.currency ?? "EUR" }).format(n);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={lbl}>Arrivée</label>
          <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Départ</label>
          <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Voyageurs</label>
          <input type="number" min={1} max={50} value={guests} onChange={e => setGuests(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Plan tarifaire</label>
          <select value={planId} onChange={e => setPlanId(e.target.value)} className={inp}>
            <option value="">Standard</option>
            {ratePlans.filter(p => p.isActive).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {calcError && <p className="text-sm text-red-500">{calcError}</p>}

      {breakdown && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1.5 text-sm">
          <Row label={`${breakdown.nights} nuit${breakdown.nights > 1 ? "s" : ""} × ${fmt(breakdown.baseRate)}`} value={fmt(breakdown.nightsTotal)} />
          {breakdown.lengthDiscount > 0 && (
            <Row label="Remise durée de séjour" value={`−${fmt(breakdown.lengthDiscount)}`} accent="text-green-600" />
          )}
          {breakdown.cleaningFee > 0 && (
            <Row label="Frais de ménage" value={fmt(breakdown.cleaningFee)} />
          )}
          {breakdown.extraGuestFee > 0 && (
            <Row label="Voyageurs supplémentaires" value={fmt(breakdown.extraGuestFee)} />
          )}
          <div className="border-t border-gray-200 pt-1.5 mt-1.5">
            <Row label="Total" value={fmt(breakdown.total)} bold />
            {breakdown.securityDeposit > 0 && (
              <Row label="Caution (non incluse)" value={fmt(breakdown.securityDeposit)} accent="text-amber-600" />
            )}
          </div>
          {breakdown.notes.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {breakdown.notes.map((n, i) => (
                <li key={i} className="text-xs text-gray-400">• {n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!breakdown && !calcError && (
        <p className="text-sm text-gray-400">Sélectionnez des dates pour calculer.</p>
      )}
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div className="flex justify-between">
      <span className={`text-gray-600 ${bold ? "font-semibold text-gray-900" : ""}`}>{label}</span>
      <span className={`font-medium ${bold ? "text-gray-900 text-base" : ""} ${accent ?? ""}`}>{value}</span>
    </div>
  );
}

const lbl = "block text-xs font-medium text-gray-600 mb-1";
const inp = "w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
