"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PricingRuleType } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

// ─── Rate Plans ──────────────────────────────────────────────────────────────

const ratePlanSchema = z.object({
  name: z.string().min(1).max(100),
  descriptionFr: z.string().max(500).optional(),
  descriptionEn: z.string().max(500).optional(),
  isRefundable: z.coerce.boolean().default(true),
  minNights: z.coerce.number().int().min(1).max(365).default(1),
  maxNights: z.coerce.number().int().min(1).max(365).optional().nullable(),
  multiplier: z.coerce.number().min(0.1).max(10).default(1),
  isActive: z.coerce.boolean().default(true),
});

async function assertPropertyOwner(propertyId: string, userId: string) {
  const p = await prisma.property.findFirst({ where: { id: propertyId, ownerId: userId } });
  return !!p;
}

export async function createRatePlan(propertyId: string, data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };
  if (!(await assertPropertyOwner(propertyId, session.user.id))) return { error: "Bien introuvable." };

  const parsed = ratePlanSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  await prisma.ratePlan.create({ data: { ...parsed.data, propertyId } });
  revalidatePath(`/properties/${propertyId}/pricing`);
  return { success: true };
}

export async function updateRatePlan(
  ratePlanId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const plan = await prisma.ratePlan.findFirst({
    where: { id: ratePlanId, property: { ownerId: session.user.id } },
  });
  if (!plan) return { error: "Plan tarifaire introuvable." };

  const parsed = ratePlanSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  await prisma.ratePlan.update({ where: { id: ratePlanId }, data: parsed.data });
  revalidatePath(`/properties/${plan.propertyId}/pricing`);
  return { success: true };
}

export async function deleteRatePlan(ratePlanId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const plan = await prisma.ratePlan.findFirst({
    where: { id: ratePlanId, property: { ownerId: session.user.id } },
  });
  if (!plan) return { error: "Plan tarifaire introuvable." };

  await prisma.ratePlan.delete({ where: { id: ratePlanId } });
  revalidatePath(`/properties/${plan.propertyId}/pricing`);
  return { success: true };
}

// ─── Pricing Rules ───────────────────────────────────────────────────────────

const pricingRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("BASE"),
    amount: z.coerce.number().positive(),
    currency: z.string().length(3).default("EUR"),
    platform: z.string().optional(),
  }),
  z.object({
    type: z.literal("SEASONAL"),
    amount: z.coerce.number().positive(),
    currency: z.string().length(3).default("EUR"),
    startDate: z.string().date(),
    endDate: z.string().date(),
    platform: z.string().optional(),
  }),
  z.object({
    type: z.literal("LENGTH_OF_STAY"),
    amount: z.coerce.number().positive(),
    currency: z.string().length(3).default("EUR"),
    minNights: z.coerce.number().int().min(2),
    discount: z.coerce.number().min(1).max(99),
  }),
  z.object({
    type: z.literal("CLEANING_FEE"),
    amount: z.coerce.number().min(0),
    currency: z.string().length(3).default("EUR"),
    platform: z.string().optional(),
  }),
  z.object({
    type: z.literal("SECURITY_DEPOSIT"),
    amount: z.coerce.number().min(0),
    currency: z.string().length(3).default("EUR"),
  }),
  z.object({
    type: z.literal("EXTRA_GUEST"),
    amount: z.coerce.number().min(0),
    currency: z.string().length(3).default("EUR"),
  }),
]);

export async function createPricingRule(
  propertyId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };
  if (!(await assertPropertyOwner(propertyId, session.user.id))) return { error: "Bien introuvable." };

  const parsed = pricingRuleSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const ruleData = parsed.data as Record<string, unknown>;

  await prisma.pricingRule.create({
    data: {
      propertyId,
      type: ruleData.type as PricingRuleType,
      amount: ruleData.amount as number,
      currency: (ruleData.currency as string) ?? "EUR",
      startDate: ruleData.startDate ? new Date(ruleData.startDate as string) : undefined,
      endDate: ruleData.endDate ? new Date(ruleData.endDate as string) : undefined,
      minNights: ruleData.minNights as number | undefined,
      discount: ruleData.discount as number | undefined,
      platform: ruleData.platform as string | undefined,
    },
  });

  revalidatePath(`/properties/${propertyId}/pricing`);
  return { success: true };
}

export async function deletePricingRule(ruleId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const rule = await prisma.pricingRule.findFirst({
    where: { id: ruleId, property: { ownerId: session.user.id } },
  });
  if (!rule) return { error: "Règle introuvable." };

  await prisma.pricingRule.delete({ where: { id: ruleId } });
  revalidatePath(`/properties/${rule.propertyId}/pricing`);
  return { success: true };
}
