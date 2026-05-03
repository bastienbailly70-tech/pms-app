"use client";

import { useState, useTransition } from "react";
import { createRatePlan } from "@/actions/pricing";

export function AddRatePlanForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createRatePlan(propertyId, {
        name: fd.get("name"),
        descriptionFr: fd.get("descriptionFr"),
        isRefundable: fd.get("isRefundable") === "true",
        minNights: fd.get("minNights"),
        multiplier: fd.get("multiplier"),
        isActive: true,
      });
      if ("error" in result) setError(result.error);
      else { setOpen(false); (e.target as HTMLFormElement).reset(); }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
      >
        + Nouveau plan tarifaire
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-blue-900">Nouveau plan tarifaire</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Nom *</label>
          <input name="name" required placeholder="Ex: Standard, Non remboursable…" className={inp} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Description (FR)</label>
          <input name="descriptionFr" placeholder="Description courte" className={inp} />
        </div>
        <div>
          <label className={lbl}>Multiplicateur</label>
          <input name="multiplier" type="number" step="0.01" min="0.1" max="10" defaultValue="1" className={inp} />
          <p className="text-xs text-gray-400 mt-0.5">0.9 = -10%, 1 = standard</p>
        </div>
        <div>
          <label className={lbl}>Séjour min (nuits)</label>
          <input name="minNights" type="number" min="1" defaultValue="1" className={inp} />
        </div>
        <div>
          <label className={lbl}>Remboursable</label>
          <select name="isRefundable" defaultValue="true" className={inp}>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Annuler
        </button>
      </div>
    </form>
  );
}

const lbl = "block text-xs font-medium text-blue-900 mb-1";
const inp = "w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
