"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

export async function updateCommissionRate(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Non autorisé." };

  const schema = z.object({
    commissionRate: z.coerce
      .number()
      .min(0, "Le taux ne peut pas être négatif.")
      .max(100, "Le taux ne peut pas dépasser 100%."),
  });

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Valeur invalide." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { commissionRate: parsed.data.commissionRate / 100 }, // store as 0.15 not 15
  });

  revalidatePath("/settings");
  revalidatePath("/analytics");
  return { success: true };
}
