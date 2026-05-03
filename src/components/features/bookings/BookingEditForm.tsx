"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBooking } from "@/actions/bookings";

const STATUSES = [
  { value: "CONFIRMED", label: "Confirmée",   color: "#059669" },
  { value: "PENDING",   label: "En attente",  color: "#d97706" },
  { value: "CANCELLED", label: "Annulée",     color: "#6b7280" },
  { value: "COMPLETED", label: "Terminée",    color: "#2563eb" },
];

const SOURCES = [
  { value: "MANUAL",      label: "Direct / Manuel" },
  { value: "AIRBNB",      label: "Airbnb" },
  { value: "BOOKING_COM", label: "Booking.com" },
  { value: "AGODA",       label: "Agoda" },
  { value: "VRBO",        label: "Vrbo" },
  { value: "EXPEDIA",     label: "Expedia" },
  { value: "GOOGLE_VR",   label: "Google Vacation Rentals" },
  { value: "OTHER",       label: "Autre" },
];

const PAYMENT_METHODS = [
  { value: "",         label: "Non précisé" },
  { value: "CARD",     label: "Carte bancaire" },
  { value: "CASH",     label: "Espèces" },
  { value: "TRANSFER", label: "Virement" },
  { value: "CHECK",    label: "Chèque" },
  { value: "PAYPAL",   label: "PayPal" },
  { value: "OTHER",    label: "Autre" },
];

type Props = {
  bookingId: string;
  initial: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    guests: number;
    status: string;
    source: string;
    checkIn: string;
    checkOut: string;
    totalAmount: string;
    deposit: string;
    isPaid: boolean;
    paymentMethod: string;
    internalNotes: string;
  };
};

export function BookingEditForm({ bookingId, initial }: Props) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function set(key: keyof typeof form, value: string | boolean | number) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  const total   = parseFloat(form.totalAmount) || 0;
  const dep     = parseFloat(form.deposit) || 0;
  const balance = Math.max(0, total - dep);
  const fmt     = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  function handleSave() {
    startTransition(async () => {
      setError(null);
      const result = await updateBooking(bookingId, {
        ...form,
        guests:      Number(form.guests),
        totalAmount: form.totalAmount === "" ? null : parseFloat(form.totalAmount),
        deposit:     form.deposit === "" ? null : parseFloat(form.deposit),
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      }
    });
  }

  const statusObj = STATUSES.find(s => s.value === form.status);

  return (
    <div className="space-y-6">

      {/* ── Voyageur ── */}
      <section className="card p-5">
        <p className="section-title mb-4">Voyageur</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className={lbl}>Nom *</label>
            <input className={inp} value={form.guestName} onChange={e => set("guestName", e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input className={inp} type="email" value={form.guestEmail} onChange={e => set("guestEmail", e.target.value)} placeholder="jean@exemple.com" />
          </div>
          <div>
            <label className={lbl}>Téléphone</label>
            <input className={inp} type="tel" value={form.guestPhone} onChange={e => set("guestPhone", e.target.value)} placeholder="+33 6 00 00 00 00" />
          </div>
        </div>
      </section>

      {/* ── Séjour ── */}
      <section className="card p-5">
        <p className="section-title mb-4">Séjour</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={lbl}>Arrivée</label>
            <input className={inp} type="date" value={form.checkIn} onChange={e => set("checkIn", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Départ</label>
            <input className={inp} type="date" value={form.checkOut} onChange={e => set("checkOut", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Voyageurs</label>
            <input className={inp} type="number" min={1} max={50} value={form.guests} onChange={e => set("guests", e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Source</label>
            <select className={inp} value={form.source} onChange={e => set("source", e.target.value)}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Statut */}
        <div className="mt-4">
          <label className={lbl}>Statut</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {STATUSES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("status", s.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:   form.status === s.value ? s.color + "20" : "var(--surface)",
                  color:        form.status === s.value ? s.color : "var(--text-secondary)",
                  borderColor:  form.status === s.value ? s.color + "60" : "var(--border)",
                  fontWeight:   form.status === s.value ? 700 : 500,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paiement ── */}
      <section className="card p-5">
        <p className="section-title mb-4">Paiement</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={lbl}>Montant total (€)</label>
            <input className={inp} type="number" min={0} step={1} value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Acompte reçu (€)</label>
            <input className={inp} type="number" min={0} step={1} value={form.deposit} onChange={e => set("deposit", e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className={lbl}>Mode de paiement</label>
            <select className={inp} value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-3 cursor-pointer pb-1">
              <div
                onClick={() => set("isPaid", !form.isPaid)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${form.isPaid ? "bg-green-500" : "bg-gray-300"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPaid ? "translate-x-5" : "translate-x-1"}`} />
              </div>
              <span className={`text-sm font-medium ${form.isPaid ? "text-green-700" : "text-gray-500"}`}>
                {form.isPaid ? "Soldé" : "En attente"}
              </span>
            </label>
          </div>
        </div>

        {/* Récap financier */}
        {total > 0 && (
          <div
            className="mt-4 rounded-xl px-4 py-3 text-sm space-y-1.5"
            style={{ background: "var(--bg)", border: "1px solid var(--border-light)" }}
          >
            <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
              <span>Total</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(total)}</span>
            </div>
            {dep > 0 && (
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Acompte reçu</span>
                <span className="font-semibold text-green-600">−{fmt(dep)}</span>
              </div>
            )}
            <div
              className="flex justify-between font-bold pt-1.5"
              style={{ borderTop: "1px solid var(--border)", color: balance > 0 ? "#d97706" : "#059669" }}
            >
              <span>Solde restant</span>
              <span>{fmt(balance)}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Notes internes ── */}
      <section className="card p-5">
        <p className="section-title mb-3">Notes internes</p>
        <textarea
          className={inp}
          rows={3}
          value={form.internalNotes}
          onChange={e => set("internalNotes", e.target.value)}
          placeholder="Informations visibles uniquement par vous…"
          maxLength={2000}
        />
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !form.guestName.trim()}
          className="btn btn-primary"
          style={{ minWidth: 140 }}
        >
          {pending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>

        {saved && (
          <span className="text-sm animate-fade-in" style={{ color: "var(--success)" }}>
            Modifications sauvegardées
          </span>
        )}

        {error && (
          <span className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {statusObj && (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: statusObj.color + "15", color: statusObj.color }}
            >
              {statusObj.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = "block text-xs font-medium mb-1.5" + " " + "text-[var(--text-tertiary)]";
const inp = "w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] bg-[var(--surface)] border-[var(--border)]";
