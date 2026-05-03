"use client";

import { useState, useTransition } from "react";
import { updateRatePlan, deleteRatePlan } from "@/actions/pricing";
import type { RatePlanModel } from "@/generated/prisma/models";

type Props = { plan: RatePlanModel };

export function RatePlanCard({ plan }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const multiplier = Number(plan.multiplier);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateRatePlan(plan.id, {
        name: fd.get("name"),
        descriptionFr: fd.get("descriptionFr"),
        isRefundable: fd.get("isRefundable") === "true",
        minNights: fd.get("minNights"),
        maxNights: fd.get("maxNights") || null,
        multiplier: fd.get("multiplier"),
        isActive: fd.get("isActive") === "true",
      });
      if ("error" in result) setError(result.error);
      else setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer le plan "${plan.name}" ?`)) return;
    startTransition(async () => { await deleteRatePlan(plan.id); });
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Nom</label>
            <input name="name" defaultValue={plan.name} required className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Description (FR)</label>
            <input name="descriptionFr" defaultValue={plan.descriptionFr ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Multiplicateur</label>
            <input name="multiplier" type="number" step="0.01" min="0.1" max="10" defaultValue={multiplier} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Séjour min (nuits)</label>
            <input name="minNights" type="number" min="1" defaultValue={plan.minNights} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Remboursable</label>
            <select name="isRefundable" defaultValue={String(plan.isRefundable)} className={inputClass}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Actif</label>
            <select name="isActive" defaultValue={String(plan.isActive)} className={inputClass}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={primaryBtn}>Enregistrer</button>
          <button type="button" onClick={() => setEditing(false)} className={secondaryBtn}>Annuler</button>
        </div>
      </form>
    );
  }

  return (
    <div className={`bg-white border rounded-xl p-4 ${plan.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{plan.name}</span>
            {!plan.isRefundable && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Non remb.</span>
            )}
            {!plan.isActive && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Inactif</span>
            )}
          </div>
          {plan.descriptionFr && (
            <p className="text-xs text-gray-500 mt-0.5">{plan.descriptionFr}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>×{multiplier === 1 ? "1,00 (prix standard)" : multiplier.toFixed(2)}</span>
            <span>Min {plan.minNights} nuit{plan.minNights > 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Modifier
          </button>
          <button onClick={handleDelete} disabled={pending} className="px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

const labelClass = "block text-xs font-medium text-gray-600 mb-1";
const inputClass = "w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const primaryBtn = "px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors";
const secondaryBtn = "px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors";
