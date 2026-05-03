"use client";

import { useState } from "react";
import { importPropertyFromUrl } from "@/actions/import-property";
import type { ImportedProperty } from "@/lib/property-importer";
import { IconSync, IconCheck, IconX } from "@/components/ui/icons";

const PLATFORM_HINTS = [
  { name: "Airbnb", color: "#FF385C", domain: "airbnb.fr" },
  { name: "Booking.com", color: "#003580", domain: "booking.com" },
  { name: "Abritel/VRBO", color: "#3D67FF", domain: "abritel.fr" },
];

type Props = {
  onImport: (data: ImportedProperty) => void;
};

export function ImportFromUrl({ onImport }: Props) {
  const [url, setUrl]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleImport() {
    if (!url.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await importPropertyFromUrl(url);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const fields = [
      result.data.name && "nom",
      result.data.city && "ville",
      result.data.maxGuests && `${result.data.maxGuests} voyageurs`,
      result.data.bedrooms && `${result.data.bedrooms} chambres`,
      result.data.descriptionEn && "description",
    ].filter(Boolean);

    setSuccess(`${result.data.sourcePlatform ?? "Page"} importée — ${fields.join(", ")}`);
    onImport(result.data);
  }

  return (
    <div
      className="card p-5 mb-6"
      style={{ background: "linear-gradient(135deg, #fafafe 0%, #f5f3ff 100%)", borderColor: "#e0e0f0" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--brand-light)", color: "var(--brand)" }}
        >
          <IconSync size={14} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Importer depuis une annonce
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Collez le lien de votre annonce — le formulaire se remplit automatiquement
          </p>
        </div>
      </div>

      {/* Supported platforms */}
      <div className="flex items-center gap-2 mb-3">
        {PLATFORM_HINTS.map(p => (
          <span
            key={p.name}
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: p.color + "15", color: p.color, border: `1px solid ${p.color}30` }}
          >
            {p.name}
          </span>
        ))}
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>+ autres sites</span>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(null); setSuccess(null); }}
          onKeyDown={e => e.key === "Enter" && handleImport()}
          placeholder="https://www.airbnb.fr/rooms/123456"
          className="input flex-1 text-sm"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="btn btn-primary shrink-0"
          style={{ opacity: loading || !url.trim() ? 0.6 : 1 }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyse…
            </span>
          ) : "Importer"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl text-sm"
          style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #fecaca" }}>
          <IconX size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2.5 rounded-xl text-sm"
          style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid #a7f3d0" }}>
          <IconCheck size={14} />
          {success}
        </div>
      )}
    </div>
  );
}
