import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PropertyForm } from "@/components/features/properties/PropertyForm";
import { PhotoManager } from "@/components/features/properties/PhotoManager";
import { DeletePropertyButton } from "@/components/features/properties/DeletePropertyButton";
import { getPropertyRole } from "@/lib/access";
import {
  IconCalendar, IconBarChart, IconSync, IconUsers, IconChevronRight,
} from "@/components/ui/icons";
import type { PropertyModel, PropertyPhotoModel } from "@/generated/prisma/models";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const role = await getPropertyRole(session.user.id, id);
  if (!role) notFound();

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      _count: { select: { bookings: true } },
    },
  });
  if (!property) notFound();

  const isOwner  = role === "OWNER";
  const canEdit  = role === "OWNER" || role === "MANAGER";
  const { photos, _count, ...propertyData } = property;

  const navLinks = [
    { href: `/properties/${id}/calendar`,  icon: <IconCalendar size={14} />,  label: "Calendrier" },
    { href: `/properties/${id}/pricing`,   icon: <IconBarChart size={14} />,  label: "Tarifs" },
    { href: `/properties/${id}/platforms`, icon: <IconSync size={14} />,      label: "Plateformes" },
    ...(isOwner ? [{ href: `/properties/${id}/team`, icon: <IconUsers size={14} />, label: "Équipe" }] : []),
  ];

  return (
    <div className="px-8 py-7 max-w-3xl mx-auto animate-fade-in">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-6">
        <Link
          href="/properties"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          Biens
        </Link>
        <IconChevronRight size={13} style={{ color: "var(--text-tertiary)" } as React.CSSProperties} />
        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {property.name}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {property.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {_count.bookings} réservation{_count.bookings !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="btn btn-secondary btn-sm">
              {link.icon}
              {link.label}
            </Link>
          ))}
          {isOwner && <DeletePropertyButton propertyId={id} propertyName={property.name} />}
        </div>
      </div>

      {!canEdit && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm"
          style={{ background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid #fde68a" }}
        >
          <span>⚠</span>
          Vous avez accès en lecture seule à ce bien.
        </div>
      )}

      {/* Photos */}
      <div className="card p-6 mb-5">
        <p className="section-title mb-4">Photos</p>
        <PhotoManager
          propertyId={id}
          initialPhotos={photos as PropertyPhotoModel[]}
        />
      </div>

      {/* Form */}
      <div className="card p-6">
        <p className="section-title mb-4">Informations</p>
        <PropertyForm property={propertyData as PropertyModel} />
      </div>
    </div>
  );
}
