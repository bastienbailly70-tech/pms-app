"use client";

import { useState, useTransition } from "react";
import { createPricingRule, deletePricingRule } from "@/actions/pricing";
import type { PricingRuleModel } from "@/generated/prisma/models";

type Props = {
  propertyId: string;
  rules: PricingRuleModel[];
};

const TYPE_LABELS: Record<string, string> = {
  BASE: "Prix de base",
  SEASONAL: "Saisonnier",
  LENGTH_OF_STAY: "Remise durée",
  CLEANING_FEE: "Frais ménage",
  SECURITY_DEPOSIT: "Caution",
  EXTRA_GUEST: "Voyageur suppl.",
};

const TYPE_COLORS: Record<string, string> = {
  BASE: "bg-blue-100 text-blue-700",
  SEASONAL: "bg-purple-100 text-purple-700",
  LENGTH_OF_STAY: "bg-green-100 text-green-700",
  CLEANING_FEE: "bg-gray-100 text-gray-600",
  SECURITY_DEPOSIT: "bg-amber-100 text-amber-700",
  EXTRA_GUEST: "bg-orange-100 text-orange-700",
};

function fmtAmount(rule: PricingRuleModel): string {
  const n = Number(rule.amount);
  if (rule.type === "LENGTH_OF_STAY") return `−${rule.discount}%`;
  if (rule.type === "SEASONAL") return `${n} ${rule.currency}/nuit`;
  if (rule.type === "EXTRA_GUEST") return `+${n} ${rule.currency}/nuit/pers.`;
  return `${n} ${rule.currency}`;
}

export function PricingRulesTable({ propertyId, rules }: Props) {
  const [addType, setAddType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const type = fd.get("type") as string;

    const data: Record<string, unknown> = { type, currency: "EUR" };
    data.amount = fd.get("amount");
    if (type === "SEASONAL") {
      data.startDate = fd.get("startDate");
      data.endDate = fd.get("endDate");
      data.platform = fd.get("platform") || undefined;
    }
    if (type === "LENGTH_OF_STAY") {
      data.minNights = fd.get("minNights");
      data.discount = fd.get("discount");
    }
    if (type === "BASE" || type === "CLEANING_FEE") {
      data.platform = fd.get("platform") || undefined;
    }

    startTransition(async () => {
      const result = await createPricingRule(propertyId, data);
      if ("error" in result) setError(result.error);
      else { setAddType(null); (e.target as HTMLFormElement).reset(); }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette règle ?")) return;
    startTransition(async () => { await deletePricingRule(id); });
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Aucune règle de prix définie.</p>
      ) : (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="text-left py-2 font-medium">Type</th>
              <th className="text-left py-2 font-medium">Montant</th>
              <th className="text-left py-2 font-medium hidden sm:table-cell">Plateforme</th>
              <th className="text-left py-2 font-medium hidden sm:table-cell">Période</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[rule.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABELS[rule.type] ?? rule.type}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-medium text-gray-900">{fmtAmount(rule)}</td>
                <td className="py-2.5 pr-3 text-gray-500 hidden sm:table-cell">
                  {rule.platform ?? <span className="text-gray-300">Toutes</span>}
                </td>
                <td className="py-2.5 pr-3 text-gray-500 hidden sm:table-cell text-xs">
                  {rule.startDate && rule.endDate
                    ? `${fmt(rule.startDate)} → ${fmt(rule.endDate)}`
                    : rule.minNights
                    ? `≥ ${rule.minNights} nuits`
                    : "—"}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={pending}
                    className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add rule UI */}
      {addType === null ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => setAddType(type)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              + {label}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <input type="hidden" name="type" value={addType} />
          <h3 className="text-sm font-semibold text-gray-800">
            Ajouter : {TYPE_LABELS[addType]}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {addType !== "LENGTH_OF_STAY" && (
              <div>
                <label className={lbl}>
                  {addType === "SEASONAL" ? "Prix/nuit (€)" : addType === "EXTRA_GUEST" ? "Prix/nuit/pers. (€)" : "Montant (€)"}
                </label>
                <input name="amount" type="number" step="0.01" min="0" required className={inp} placeholder="0.00" />
              </div>
            )}

            {addType === "SEASONAL" && (
              <>
                <div>
                  <label className={lbl}>Du</label>
                  <input name="startDate" type="date" required className={inp} />
                </div>
                <div>
                  <label className={lbl}>Au</label>
                  <input name="endDate" type="date" required className={inp} />
                </div>
              </>
            )}

            {addType === "LENGTH_OF_STAY" && (
              <>
                <div>
                  <label className={lbl}>À partir de (nuits)</label>
                  <input name="minNights" type="number" min="2" required defaultValue="7" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Remise (%)</label>
                  <input name="discount" type="number" min="1" max="99" required defaultValue="10" className={inp} />
                </div>
                <input type="hidden" name="amount" value="0" />
              </>
            )}

            {(addType === "BASE" || addType === "SEASONAL" || addType === "CLEANING_FEE") && (
              <div>
                <label className={lbl}>Plateforme (optionnel)</label>
                <select name="platform" className={inp}>
                  <option value="">Toutes</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking_com">Booking.com</option>
                  <option value="vrbo">Vrbo</option>
                  <option value="agoda">Agoda</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              Ajouter
            </button>
            <button type="button" onClick={() => { setAddType(null); setError(null); }} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function fmt(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const lbl = "block text-xs font-medium text-gray-600 mb-1";
const inp = "w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
