"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "crypto";
import { requirePropertyAccess } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import { PropertyAccessRole } from "@/generated/prisma/enums";

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["MANAGER", "VIEWER"]),
});

type ErrorResult = { error: string };
type TokenResult = { token: string; invitationId: string };
type PropertyIdResult = { propertyId: string };
type OkResult = Record<string, never>;

export async function inviteTeamMember(
  propertyId: string,
  formData: FormData
): Promise<ErrorResult | TokenResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  try {
    await requirePropertyAccess(session.user.id, propertyId, "OWNER");
  } catch {
    return { error: "Accès refusé." };
  }

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };

  const { email, role } = parsed.data;

  // If user already exists, check for existing access
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const existingAccess = await prisma.propertyAccess.findUnique({
      where: { userId_propertyId: { userId: existingUser.id, propertyId } },
    });
    if (existingAccess) return { error: "Cet utilisateur a déjà accès à ce bien." };

    // Check it's not the owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true },
    });
    if (property?.ownerId === existingUser.id) {
      return { error: "Ce compte est déjà propriétaire de ce bien." };
    }
  }

  // Revoke any pending invitation for same email on this property
  await prisma.invitation.deleteMany({
    where: { propertyId, email, acceptedAt: null },
  });

  const token = randomBytes(24).toString("base64url");
  const invitation = await prisma.invitation.create({
    data: {
      email,
      propertyId,
      role: role as PropertyAccessRole,
      token,
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await logAudit(session.user.id, "invite", "Invitation", invitation.id, { email, role });

  return { token, invitationId: invitation.id };
}

export async function acceptInvitation(
  token: string
): Promise<ErrorResult | PropertyIdResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id!;

  const invitation = await prisma.invitation.findUnique({ where: { token } });

  if (!invitation) return { error: "Invitation introuvable ou expirée." };
  if (invitation.acceptedAt) return { error: "Cette invitation a déjà été utilisée." };
  if (invitation.expiresAt < new Date()) return { error: "Cette invitation a expiré." };
  if (invitation.email !== session.user.email)
    return { error: "Cette invitation est destinée à une autre adresse email." };

  await prisma.$transaction(async tx => {
    await tx.propertyAccess.upsert({
      where: {
        userId_propertyId: { userId, propertyId: invitation.propertyId },
      },
      create: {
        userId,
        propertyId: invitation.propertyId,
        role: invitation.role,
        invitedById: invitation.invitedById,
      },
      update: { role: invitation.role },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  await logAudit(userId, "accept_invite", "PropertyAccess", invitation.propertyId);

  return { propertyId: invitation.propertyId };
}

export async function revokeAccess(
  propertyId: string,
  targetUserId: string
): Promise<ErrorResult | OkResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  try {
    await requirePropertyAccess(session.user.id, propertyId, "OWNER");
  } catch {
    return { error: "Accès refusé." };
  }

  await prisma.propertyAccess.delete({
    where: { userId_propertyId: { userId: targetUserId, propertyId } },
  });

  await logAudit(session.user.id, "revoke_access", "PropertyAccess", propertyId, {
    targetUserId,
  });

  return {};
}

export async function updateMemberRole(
  propertyId: string,
  targetUserId: string,
  role: "MANAGER" | "VIEWER"
): Promise<ErrorResult | OkResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  try {
    await requirePropertyAccess(session.user.id, propertyId, "OWNER");
  } catch {
    return { error: "Accès refusé." };
  }

  await prisma.propertyAccess.update({
    where: { userId_propertyId: { userId: targetUserId, propertyId } },
    data: { role: role as PropertyAccessRole },
  });

  await logAudit(session.user.id, "update_role", "PropertyAccess", propertyId, {
    targetUserId,
    role,
  });

  return {};
}

export async function cancelInvitation(
  propertyId: string,
  invitationId: string
): Promise<ErrorResult | OkResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  try {
    await requirePropertyAccess(session.user.id, propertyId, "OWNER");
  } catch {
    return { error: "Accès refusé." };
  }

  await prisma.invitation.delete({
    where: { id: invitationId },
  });

  return {};
}
