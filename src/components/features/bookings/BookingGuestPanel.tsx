"use client";

import { useState, useTransition } from "react";
import { updateBookingGuest } from "@/actions/bookings";
import type { GuestModel } from "@/generated/prisma/models";

type Props = {
  bookingId: string;
  guest: GuestModel | null;
};

export function BookingGuestPanel({ bookingId, guest }: Props) {
  const [editing, setEditing] = useState(!guest);
  const [name, setName] = useState(guest?.name ?? "");
  const [email, setEmail] = useState(guest?.email ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingGuest(bookingId, { name, email, phone });
      if ("error" in result) setError(result.error);
      else { setSaved(true); setEditing(false); setTimeout(() => setSaved(false), 2000); }
    });
  }

  if (!editing && guest) {
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">{guest.name}</p>
            {guest.email && <p className="text-sm text-gray-500">{guest.email}</p>}
            {guest.phone && <p className="text-sm text-gray-500">{guest.phone}</p>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline shrink-0"
          >
            Modifier
          </button>
        </div>
        {saved && <p className="text-xs text-green-600">Enregistré ✓</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className={lbl}>Nom *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inp} placeholder="Jean Dupont" />
      </div>
      <div>
        <label className={lbl}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="jean@exemple.com" />
      </div>
      <div>
        <label className={lbl}>Téléphone</label>
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="+33 6 00 00 00 00" />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={pending || !name.trim()}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {guest && (
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

const lbl = "block text-xs font-medium text-gray-600 mb-1";
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
