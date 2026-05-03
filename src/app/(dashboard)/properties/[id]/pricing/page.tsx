import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RatePlanCard } from "@/components/features/pricing/RatePlanCard";
import { AddRatePlanForm } from "@/components/features/pricing/AddRatePlanForm";
import { PricingRulesTable } from "@/components/features/pricing/PricingRulesTable";
import { PriceCalculator } from "@/components/features/pricing/PriceCalculator";
import type { PricingRuleModel, RatePlanModel } from "@/generated/prisma/models";

export default async function PricingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      ratePlans: { orderBy: { createdAt: "asc" } },
      pricingRules: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!property) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/properties" className="hover:text-gray-700">Biens</Link>
        <span>/</span>
        <Link href={`/properties/${id}`} className="hover:text-gray-700 truncate max-w-[160px]">
          {property.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Tarifs</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Tarifs</h1>
        <Link href={`/properties/${id}/calendar`} className="text-sm text-blue-600 hover:underline">
          ← Calendrier
        </Link>
      </div>

      {/* Pricing Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Règles de prix
        </h2>
        <PricingRulesTable
          propertyId={id}
          rules={property.pricingRules as PricingRuleModel[]}
        />
      </div>

      {/* Rate Plans */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Plans tarifaires
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Utilisés par Booking.com et pour les remises spéciales (non remboursable, etc.)
        </p>
        <div className="space-y-3">
          {property.ratePlans.map(plan => (
            <RatePlanCard key={plan.id} plan={plan as RatePlanModel} />
          ))}
          <AddRatePlanForm propertyId={id} />
        </div>
      </div>

      {/* Price Calculator */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Simulateur de prix
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Calculez le prix pour un séjour donné avec vos règles actuelles.
        </p>
        <PriceCalculator
          rules={property.pricingRules as PricingRuleModel[]}
          ratePlans={property.ratePlans as RatePlanModel[]}
          maxGuests={property.maxGuests}
        />
      </div>
    </div>
  );
}
