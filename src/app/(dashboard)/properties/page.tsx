import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PropertyCard } from "@/components/features/properties/PropertyCard";
import { propertyWhereOwnedOrAccessible } from "@/lib/access";
import { IconPlus, IconBuilding } from "@/components/ui/icons";
import type { PropertyModel, PropertyPhotoModel } from "@/generated/prisma/models";

type PropertyWithRelations = PropertyModel & {
  photos: PropertyPhotoModel[];
  _count: { bookings: number };
  isOwner: boolean;
};

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const userId = session.user.id;

  const rawProperties = await prisma.property.findMany({
    where: propertyWhereOwnedOrAccessible(userId),
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const properties = rawProperties.map(p => ({
    ...p,
    isOwner: p.ownerId === userId,
  })) as PropertyWithRelations[];

  const ownedCount = properties.filter(p => p.isOwner).length;
  const sharedCount = properties.length - ownedCount;

  return (
    <div className="px-8 py-7 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Mes biens</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {ownedCount} bien{ownedCount !== 1 ? "s" : ""}
            {sharedCount > 0 && ` · ${sharedCount} partagé${sharedCount > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--brand)",
            boxShadow: "0 4px 12px rgb(99 102 241 / 0.25)",
          }}
        >
          <IconPlus size={15} /> Nouveau bien
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
          {properties.map((property) => (
            <div key={property.id} className="relative">
              {!property.isOwner && (
                <span
                  className="absolute top-3 right-3 z-10 text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm"
                  style={{ background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  Partagé
                </span>
              )}
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card animate-fade-in py-20 flex flex-col items-center justify-center text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "var(--brand-light)" }}
      >
        <IconBuilding size={28} style={{ color: "var(--brand)" } as React.CSSProperties} />
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Aucun bien pour l'instant
      </h2>
      <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-secondary)" }}>
        Ajoutez votre premier bien pour commencer à gérer vos locations.
      </p>
      <Link
        href="/properties/new"
        className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl"
        style={{ background: "var(--brand)" }}
      >
        <IconPlus size={14} /> Ajouter un bien
      </Link>
    </div>
  );
}
