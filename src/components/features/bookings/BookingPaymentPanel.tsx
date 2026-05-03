"use client";

import { useState, useTransition } from "react";
import { updateBookingPayment } from "@/actions/bookings";
import type { BookingModel } from "@/generated/prisma/models";

type Props = { booking: BookingModel };

export function BookingPaymentPanel({ booking }: Props) {
  const [totalAmount, setTotalAmount] = useState(booking.totalAmount ? String(Number(booking.totalAmount)) : "");
  const [deposit, setDeposit] = useState(booking.deposit ? String(Number(booking.deposit)) : "");
  const [isPaid, setIsPaid] = useState(booking.isPaid);
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = parseFloat(totalAmount) || 0;
  const dep = parseFloat(deposit) || 0;
  const balance = Math.max(0, total - dep);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingPayment(booking.id, {
        totalAmount: totalAmount || null,
        deposit: deposit || null,
        isPaid,
        internalNotes,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  const currency = booking.currency ?? "EUR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n);

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Montant total ({currency})</label>
          <input
            type="number" min={0} step={0.01}
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            placeholder="0.00"
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>Acompte ({currency})</label>
          <input
            type="number" min={0} step={0.01}
            value={deposit}
            onChange={e => setDeposit(e.target.value)}
            placeholder="0.00"
            className={inp}
          />
        </div>
      </div>

      {total > 0 && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Total</span><span className="font-medium">{fmt(total)}</span>
          </div>
          {dep > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Acompte reçu</span><span className="font-medium text-green-600">−{fmt(dep)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1 mt-1">
            <span>Solde restant</span><span className={balance > 0 ? "text-amber-600" : "text-green-600"}>{fmt(balance)}</span>
          </div>
        </div>
      )}

      {/* isPaid toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setIsPaid(p => !p)}
          className={`w-10 h-6 rounded-full transition-colors relative ${isPaid ? "bg-green-500" : "bg-gray-300"}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPaid ? "translate-x-5" : "translate-x-1"}`} />
        </div>
        <span className={`text-sm font-medium ${isPaid ? "text-green-700" : "text-gray-600"}`}>
          {isPaid ? "Payé intégralement" : "Paiement en attente"}
        </span>
      </label>

      {/* Internal notes */}
      <div>
        <label className={lbl}>Notes internes</label>
        <textarea
          value={internalNotes}
          onChange={e => setInternalNotes(e.target.value)}
          rows={3}
          className={inp}
          placeholder="Notes visibles uniquement par vous (non partagées avec le voyageur)…"
          maxLength={2000}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={pending}
        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saved ? "Enregistré ✓" : pending ? "…" : "Enregistrer"}
      </button>
    </div>
  );
}

const lbl = "block text-xs font-medium text-gray-600 mb-1";
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
