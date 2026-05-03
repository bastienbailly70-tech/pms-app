"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomBytes } from "crypto";
import { syncConnection } from "@/lib/channels/sync";

type ActionResult = { error: string } | { success: true };

const connectSchema = z.object({
  platformId: z.string().min(1).max(64),
  icalImportUrl: z.string().url().optional().or(z.literal("")),
});

export async function connectPlatform(
  propertyId: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: session.user.id },
  });
  if (!property) return { error: "Bien introuvable." };

  const parsed = connectSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { platformId, icalImportUrl } = parsed.data;

  const existing = await prisma.platformConnection.findUnique({
    where: { propertyId_platformId: { propertyId, platformId } },
  });

  if (existing) {
    await prisma.platformConnection.update({
      where: { id: existing.id },
      data: {
        icalImportUrl: icalImportUrl || null,
        isActive: true,
      },
    });
  } else {
    // Generate a 32-char random export token
    const token = randomBytes(24).toString("base64url");

    await prisma.platformConnection.create({
      data: {
        propertyId,
        platformId,
        icalImportUrl: icalImportUrl || null,
        icalExportToken: token,
        isActive: true,
      },
    });
  }

  revalidatePath(`/properties/${propertyId}/platforms`);
  return { success: true };
}

export async function disconnectPlatform(connectionId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const connection = await prisma.platformConnection.findFirst({
    where: { id: connectionId, property: { ownerId: session.user.id } },
  });
  if (!connection) return { error: "Connexion introuvable." };

  await prisma.platformConnection.delete({ where: { id: connectionId } });

  revalidatePath(`/properties/${connection.propertyId}/platforms`);
  return { success: true };
}

export async function triggerManualSync(connectionId: string): Promise<ActionResult & { result?: object }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const connection = await prisma.platformConnection.findFirst({
    where: { id: connectionId, property: { ownerId: session.user.id } },
    include: { platform: true },
  });
  if (!connection) return { error: "Connexion introuvable." };

  try {
    const result = await syncConnection(connection);
    revalidatePath(`/properties/${connection.propertyId}/platforms`);
    if (result.error) return { error: result.error };
    return { success: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}
