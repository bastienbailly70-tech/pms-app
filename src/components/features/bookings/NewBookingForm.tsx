"use client";

import { useState, useTransition } from "react";
import { createManualBooking } from "@/actions/bookings";
import { useRouter } from "next/navigation";

type Property = { id: string; name: string; maxGuests: number };

export function NewBookingForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createManualBooking({
        propertyId: fd.get("propertyId"),
        checkIn: fd.get("checkIn"),
        checkOut: fd.get("checkOut"),
        guests: fd.get("guests"),
        guestName: fd.get("guestName"),
        guestEmail: fd.get("guestEmail"),
        guestPhone: fd.get("guestPhone"),
        totalAmount: fd.get("totalAmount"),
        notes: fd.get("notes"),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push("/bookings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className={lbl}>Bien *</label>
        <select name="propertyId" required className={inp}>
          <option value="">Sélectionnez un bien</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Arrivée *</label>
          <input name="checkIn" type="date" required className={inp} />
        </div>
        <div>
          <label className={lbl}>Départ *</label>
          <input name="checkOut" type="date" required className={inp} />
        </div>
      </div>

      <div>
        <label className={lbl}>Nombre de voyageurs *</label>
        <input name="guests" type="number" min={1} max={50} defaultValue={2} required className={inp} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Voyageur</p>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Nom *</label>
            <input name="guestName" type="text" required className={inp} placeholder="Jean Dupont" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Email</label>
              <input name="guestEmail" type="email" className={inp} placeholder="jean@exemple.com" />
            </div>
            <div>
              <label className={lbl}>Téléphone</label>
              <input name="guestPhone" type="tel" className={inp} placeholder="+33 6 00 00 00 00" />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Paiement & notes</p>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Montant total (€)</label>
            <input name="totalAmount" type="number" min={0} step={0.01} className={inp} placeholder="0.00" />
          </div>
          <div>
            <label className={lbl}>Notes internes</label>
            <textarea name="notes" rows={3} className={inp} placeholder="Notes visibles uniquement par vous…" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "Création…" : "Créer la réservation"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

const lbl = "block text-sm font-medium text-gray-700 mb-1";
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
