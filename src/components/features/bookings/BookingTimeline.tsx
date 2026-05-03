import type { BookingModel, BookingConflictModel } from "@/generated/prisma/models";

type TimelineEntry = {
  date: Date;
  label: string;
  sublabel?: string;
  type: "created" | "updated" | "conflict" | "resolved" | "status";
};

const SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", AGODA: "Agoda",
  VRBO: "Vrbo", EXPEDIA: "Expedia", GOOGLE_VR: "Google VR",
  MANUAL: "Manuel", OTHER: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmée", PENDING: "En attente",
  CANCELLED: "Annulée", COMPLETED: "Terminée", CONFLICT: "Conflit détecté",
};

type Props = {
  booking: BookingModel;
  conflicts: BookingConflictModel[];
};

export function BookingTimeline({ booking, conflicts }: Props) {
  const entries: TimelineEntry[] = [];

  entries.push({
    date: booking.createdAt,
    label: `Réservation créée`,
    sublabel: `Source : ${SOURCE_LABELS[booking.source] ?? booking.source}`,
    type: "created",
  });

  for (const conflict of conflicts) {
    entries.push({
      date: conflict.createdAt,
      label: "Conflit détecté",
      sublabel: conflict.description,
      type: "conflict",
    });
    if (conflict.resolvedAt) {
      entries.push({
        date: conflict.resolvedAt,
        label: "Conflit résolu",
        type: "resolved",
      });
    }
  }

  if (
    booking.updatedAt.getTime() - booking.createdAt.getTime() > 5000 &&
    booking.status !== "CONFIRMED"
  ) {
    entries.push({
      date: booking.updatedAt,
      label: `Statut : ${STATUS_LABELS[booking.status] ?? booking.status}`,
      type: "status",
    });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const DOT_COLORS = {
    created: "bg-blue-400",
    updated: "bg-gray-400",
    conflict: "bg-red-500",
    resolved: "bg-green-500",
    status: "bg-purple-400",
  };

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${DOT_COLORS[entry.type]}`} />
            {i < entries.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 my-1" />
            )}
          </div>
          <div className="pb-4 min-w-0">
            <p className="text-sm font-medium text-gray-800">{entry.label}</p>
            {entry.sublabel && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.sublabel}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(entry.date).toLocaleString("fr-FR", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
