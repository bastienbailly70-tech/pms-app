import Link from "next/link";
import { PropertyStatus, PropertyType } from "@/generated/prisma/enums";
import type { PropertyModel, PropertyPhotoModel } from "@/generated/prisma/models";
import { IconMapPin, IconCalendar, IconUsers } from "@/components/ui/icons";

type PropertyWithRelations = PropertyModel & {
  photos: PropertyPhotoModel[];
  _count: { bookings: number };
};

const STATUS_CONFIG: Record<PropertyStatus, { label: string; pill: string }> = {
  ACTIVE:      { label: "Actif",       pill: "pill-green"  },
  INACTIVE:    { label: "Inactif",     pill: "pill-gray"   },
  MAINTENANCE: { label: "Maintenance", pill: "pill-orange" },
};

const TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Appartement",
  HOUSE:     "Maison",
  VILLA:     "Villa",
  ROOM:      "Chambre",
  OTHER:     "Autre",
};

export function PropertyCard({ property }: { property: PropertyWithRelations }) {
  const status = STATUS_CONFIG[property.status as PropertyStatus] ?? STATUS_CONFIG.ACTIVE;
  const photo  = property.photos[0];
  const location = property.city ?? property.address ?? null;

  return (
    <Link href={`/properties/${property.id}`} className="block group">
      <div className="card card-hover overflow-hidden h-full">

        {/* Photo */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          {photo ? (
            <img
              src={photo.url}
              alt={property.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--brand-light)" }}
              >
                <span className="text-2xl">🏠</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Aucune photo</p>
            </div>
          )}

          {/* Gradient overlay at bottom */}
          {photo && (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)" }}
            />
          )}

          {/* Status pill */}
          <div className="absolute top-3 left-3">
            <span className={`pill ${status.pill}`}>{status.label}</span>
          </div>

          {/* Type badge */}
          <div className="absolute bottom-3 left-3">
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm"
              style={{
                background: "rgba(255,255,255,0.9)",
                color: "var(--text-secondary)",
                border: "1px solid rgba(255,255,255,0.5)",
              }}
            >
              {TYPE_LABELS[property.type as PropertyType] ?? property.type}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-1 mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {property.name}
          </h3>

          {location && (
            <div className="flex items-center gap-1 mb-3">
              <IconMapPin size={11} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
              <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                {location}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div
            className="flex items-center gap-3 pt-3"
            style={{ borderTop: "1px solid var(--border-light)" }}
          >
            <div className="flex items-center gap-1">
              <IconUsers size={11} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {property.maxGuests} voy.
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {property.bedrooms} ch.
              </span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <IconCalendar size={11} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {property._count.bookings} rés.
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
