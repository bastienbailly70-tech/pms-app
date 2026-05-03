"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const propertySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  type: z.enum(["APARTMENT", "HOUSE", "VILLA", "ROOM", "OTHER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  timezone: z.string().default("Europe/Paris"),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  maxGuests: z.coerce.number().int().min(1).max(50),
  bedrooms: z.coerce.number().int().min(0).max(50),
  beds: z.coerce.number().int().min(1).max(100),
  bathrooms: z.coerce.number().int().min(0).max(20),
  areaSqm: z.coerce.number().positive().optional().nullable(),
  descriptionFr: z.string().max(5000).optional(),
  descriptionEn: z.string().max(5000).optional(),
  houseRulesFr: z.string().max(2000).optional(),
  houseRulesEn: z.string().max(2000).optional(),
});

type ActionResult = { error: string } | { success: true; propertyId: string };

export async function createProperty(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const property = await prisma.property.create({
    data: { ...parsed.data, ownerId: session.user.id },
  });

  revalidatePath("/properties");
  return { success: true, propertyId: property.id };
}

export async function updateProperty(
  propertyId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) return { error: "Bien introuvable." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = propertySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: parsed.data,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return { success: true, propertyId };
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) return;

  await prisma.property.delete({ where: { id: propertyId } });

  revalidatePath("/properties");
  redirect("/properties");
}
