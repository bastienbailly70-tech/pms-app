import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PlatformConnectionCard } from "@/components/features/platforms/PlatformConnectionCard";
import { AddConnectionForm } from "@/components/features/platforms/AddConnectionForm";
import type { PlatformConnectionModel, PlatformModel } from "@/generated/prisma/models";

export default async function PlatformsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const [property, platforms] = await Promise.all([
    prisma.property.findFirst({
      where: { id, ownerId: session.user.id },
      include: {
        platformConnections: {
          include: { platform: true, syncLogs: { orderBy: { createdAt: "desc" }, take: 5 } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.platform.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!property) notFound();

  const exportBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/properties" className="hover:text-gray-700">Biens</Link>
        <span>/</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-700 truncate max-w-[160px]">
          {property.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Plateformes</span>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connexions OTA</h1>
      <p className="text-sm text-gray-500 mb-6">
        Synchronisez vos disponibilités avec les plateformes de réservation via iCal.
      </p>

      {/* How it works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm">
        <p className="font-medium text-blue-900 mb-1">Comment ça marche ?</p>
        <ol className="text-blue-700 space-y-1 list-decimal list-inside">
          <li>Copiez l'URL d'export et collez-la dans la section "iCal" de chaque plateforme.</li>
          <li>Récupérez l'URL iCal depuis la plateforme et collez-la ici en import.</li>
          <li>La synchronisation tourne automatiquement toutes les 20 minutes.</li>
        </ol>
      </div>

      {/* Connections */}
      <div className="space-y-4 mb-6">
        {property.platformConnections.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Aucune plateforme connectée. Ajoutez-en une ci-dessous.
          </p>
        ) : (
          property.platformConnections.map(conn => (
            <PlatformConnectionCard
              key={conn.id}
              connection={conn as PlatformConnectionModel & { platform: PlatformModel }}
              exportBaseUrl={exportBaseUrl}
            />
          ))
        )}
      </div>

      <AddConnectionForm
        propertyId={id}
        platforms={platforms as PlatformModel[]}
        connectedPlatformIds={property.platformConnections.map(c => c.platformId)}
      />
    </div>
  );
}
