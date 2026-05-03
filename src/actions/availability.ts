"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const blockSchema = z.object({
  propertyId: z.string().cuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().max(200).optional(),
});

const settingsSchema = z.object({
  minNights: z.coerce.number().int().min(1).max(365),
  maxNights: z.coerce.number().int().min(1).max(365).optional().nullable(),
  gapDays: z.coerce.number().int().min(0).max(30),
});

type ActionResult = { error: string } | { success: true };

export async function createBlock(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const parsed = blockSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { propertyId, startDate, endDate, reason } = parsed.data;

  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) return { error: "Bien introuvable." };

  await prisma.blockedDate.create({
    data: {
      propertyId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || null,
      isManual: true,
    },
  });

  revalidatePath(`/properties/${propertyId}/calendar`);
  return { success: true };
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const block = await prisma.blockedDate.findFirst({
    where: { id: blockId, property: { ownerId: session.user.id } },
  });
  if (!block) return { error: "Blocage introuvable." };

  await prisma.blockedDate.delete({ where: { id: blockId } });

  revalidatePath(`/properties/${block.propertyId}/calendar`);
  return { success: true };
}

export async function updateAvailabilitySettings(
  propertyId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) return { error: "Bien introuvable." };

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      minNights: parsed.data.minNights,
      maxNights: parsed.data.maxNights ?? null,
      gapDays: parsed.data.gapDays,
    },
  });

  revalidatePath(`/properties/${propertyId}/calendar`);
  return { success: true };
}
