"use client";

import { useState, useTransition } from "react";
import { updateAvailabilitySettings } from "@/actions/availability";

type Props = {
  propertyId: string;
  minNights: number;
  maxNights: number | null;
  gapDays: number;
};

export function AvailabilitySettings({ propertyId, minNights, maxNights, gapDays }: Props) {
  const [min, setMin] = useState(String(minNights));
  const [max, setMax] = useState(maxNights ? String(maxNights) : "");
  const [gap, setGap] = useState(String(gapDays));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateAvailabilitySettings(propertyId, {
        minNights: min,
        maxNights: max || null,
        gapDays: gap,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const inputClass =
    "w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-center";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Règles de disponibilité
      </h2>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Séjour min (nuits)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={min}
            onChange={e => setMin(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Séjour max (nuits)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={max}
            onChange={e => setMax(e.target.value)}
            placeholder="∞"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Délai préparation (jours)
          </label>
          <input
            type="number"
            min={0}
            max={30}
            value={gap}
            onChange={e => setGap(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saved ? "Enregistré ✓" : pending ? "..." : "Enregistrer"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Ces valeurs s'appliquent par défaut sur toutes les plateformes. Elles pourront être
        surchargées par plan tarifaire (étape 4).
      </p>
    </div>
  );
}
