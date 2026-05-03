"use client";

import { useState, useTransition } from "react";
import { updateCommissionRate } from "@/actions/settings";

type Props = { initialRate: number }; // in percent, e.g. 15

export function CommissionSettings({ initialRate }: Props) {
  const [rate, setRate]     = useState(String(initialRate));
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

  const rateNum    = parseFloat(rate) || 0;
  const example    = 1000;
  const commission = Math.round(example * rateNum) / 100;
  const net        = example - commission;

  function handleSave() {
    setError(null);
    start(async () => {
      const result = await updateCommissionRate({ commissionRate: rateNum });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="w-36">
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            Taux de commission
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={rate}
              onChange={e => { setRate(e.target.value); setSaved(false); setError(null); }}
              className="input pr-8"
              placeholder="15"
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold pointer-events-none"
              style={{ color: "var(--text-tertiary)" }}
            >
              %
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="btn btn-primary btn-sm"
        >
          {pending ? "…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      {/* Preview */}
      <div
        className="rounded-xl px-4 py-3 text-sm space-y-1.5"
        style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
          Exemple pour une réservation de 1 000 €
        </p>
        <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
          <span>Montant brut</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>1 000 €</span>
        </div>
        <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
          <span>Commission ({rateNum}%)</span>
          <span className="font-medium" style={{ color: "#d97706" }}>− {commission} €</span>
        </div>
        <div
          className="flex justify-between font-bold pt-1.5"
          style={{ borderTop: "1px solid var(--border)", color: "#059669" }}
        >
          <span>Montant net</span>
          <span>{net} €</span>
        </div>
      </div>
    </div>
  );
}
