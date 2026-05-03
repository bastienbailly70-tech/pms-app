"use client";

import { useState, useTransition } from "react";
import { connectPlatform } from "@/actions/platforms";
import type { PlatformModel } from "@/generated/prisma/models";

type Props = {
  propertyId: string;
  platforms: PlatformModel[];
  connectedPlatformIds: string[];
};

export function AddConnectionForm({ propertyId, platforms, connectedPlatformIds }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = platforms.filter(p => !connectedPlatformIds.includes(p.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPlatform) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectPlatform(propertyId, {
        platformId: selectedPlatform.id,
        icalImportUrl: fd.get("icalImportUrl"),
      });
      if ("error" in result) setError(result.error);
      else { setOpen(false); setSelectedPlatform(null); }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available.length === 0}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {available.length === 0 ? "Toutes les plateformes sont connectées" : "+ Connecter une plateforme"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-blue-900">Nouvelle connexion</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Platform picker */}
      {!selectedPlatform ? (
        <div>
          <p className="text-xs font-medium text-blue-800 mb-2">Choisissez une plateforme</p>
          <div className="flex flex-wrap gap-2">
            {available.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p)}
                className="px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-900">{selectedPlatform.name}</span>
            <button
              type="button"
              onClick={() => setSelectedPlatform(null)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Changer
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-800 mb-1">
              URL iCal d'import (depuis {selectedPlatform.name})
            </label>
            <input
              name="icalImportUrl"
              type="url"
              placeholder="https://www.airbnb.com/calendar/ical/..."
              className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-xs text-blue-600 mt-1">
              Optionnel — laissez vide pour export uniquement.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {pending ? "Connexion…" : "Connecter"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setSelectedPlatform(null); }}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
