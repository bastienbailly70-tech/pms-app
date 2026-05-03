"use client";

import { useState, useTransition } from "react";
import { resolveConflict, type ConflictResolution } from "@/actions/bookings";
import type { BookingConflictModel, BookingModel, PropertyModel, GuestModel } from "@/generated/prisma/models";

type Props = {
  conflict: BookingConflictModel & {
    booking: BookingModel & {
      property: Pick<PropertyModel, "id" | "name">;
      guest: GuestModel | null;
    };
  };
  overlapping: (BookingModel & { guest: GuestModel | null }) | null;
};

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  VRBO: "Vrbo",
  EXPEDIA: "Expedia",
  GOOGLE_VR: "Google VR",
  MANUAL: "Manuel",
  OTHER: "Autre",
};

export function ConflictCard({ conflict, overlapping }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nb = conflict.booking; // the new (CONFLICT-status) booking
  const ex = overlapping;      // the existing confirmed booking

  function resolve(resolution: ConflictResolution) {
    setError(null);
    startTransition(async () => {
      const result = await resolveConflict(conflict.id, resolution);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-red-50 border-b border-red-200">
        <span className="text-red-500 text-lg">⚠</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-900">
            Conflit de dates — {nb.property.name}
          </p>
          <p className="text-xs text-red-600 mt-0.5 truncate">{conflict.description}</p>
        </div>
        <span className="shrink-0 text-xs text-red-500">
          {new Date(conflict.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="p-5">
        {/* Two bookings side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <BookingMini
            label="Réservation existante"
            booking={ex}
            accent="blue"
          />
          <BookingMini
            label="Nouvelle réservation (conflit)"
            booking={nb}
            accent="red"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Resolution buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => resolve("keep_existing")}
            disabled={pending}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            Garder l'existante
          </button>
          {ex && (
            <button
              onClick={() => resolve("keep_new")}
              disabled={pending}
              className="flex-1 min-w-[140px] px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              Garder la nouvelle
            </button>
          )}
          <button
            onClick={() => resolve("cancel_both")}
            disabled={pending}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Annuler les deux
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          La résolution annule la réservation concernée et marque le conflit comme résolu.
        </p>
      </div>
    </div>
  );
}

function BookingMini({
  label,
  booking,
  accent,
}: {
  label: string;
  booking: (BookingModel & { guest: GuestModel | null }) | null;
  accent: "blue" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };

  if (!booking) {
    return (
      <div className={`rounded-lg border p-3 ${colors[accent]}`}>
        <p className="text-xs font-medium mb-1 opacity-70">{label}</p>
        <p className="text-sm text-gray-400">Aucune réservation correspondante trouvée.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <p className="text-xs font-medium mb-2 opacity-70">{label}</p>
      <p className="text-sm font-semibold">
        {new Date(booking.checkIn).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        {" → "}
        {new Date(booking.checkOut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </p>
      {booking.guest && (
        <p className="text-xs mt-1 opacity-80">{booking.guest.name}</p>
      )}
      <p className="text-xs mt-0.5 opacity-70">
        {SOURCE_LABELS[booking.source] ?? booking.source}
      </p>
    </div>
  );
}
