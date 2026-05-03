"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBooking, markBookingCompleted } from "@/actions/bookings";

type Props = {
  bookingId: string;
  status: string;
};

export function BookingActions({ bookingId, status }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canComplete = status === "CONFIRMED" || status === "PENDING";
  const canCancel = status !== "CANCELLED" && status !== "COMPLETED";

  function handleComplete() {
    if (!confirm("Marquer cette réservation comme terminée ?")) return;
    startTransition(async () => {
      await markBookingCompleted(bookingId);
      router.refresh();
    });
  }

  function handleCancel() {
    if (!confirm("Annuler cette réservation ? Cette action peut être inversée manuellement.")) return;
    startTransition(async () => {
      await cancelBooking(bookingId);
      router.refresh();
    });
  }

  if (!canComplete && !canCancel) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canComplete && (
        <button
          onClick={handleComplete}
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          ✓ Marquer terminée
        </button>
      )}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={pending}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          Annuler la réservation
        </button>
      )}
    </div>
  );
}
