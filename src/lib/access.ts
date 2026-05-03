import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type PropertyRole = "OWNER" | "MANAGER" | "VIEWER";

const ROLE_LEVEL: Record<PropertyRole, number> = {
  VIEWER: 1,
  MANAGER: 2,
  OWNER: 3,
};

export async function getPropertyRole(
  userId: string,
  propertyId: string
): Promise<PropertyRole | null> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId },
    select: {
      ownerId: true,
      accessList: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!property) return null;
  if (property.ownerId === userId) return "OWNER";
  const access = property.accessList[0];
  return (access?.role as PropertyRole) ?? null;
}

export async function requirePropertyAccess(
  userId: string,
  propertyId: string,
  minRole: PropertyRole = "VIEWER"
): Promise<PropertyRole> {
  const role = await getPropertyRole(userId, propertyId);
  if (!role || ROLE_LEVEL[role] < ROLE_LEVEL[minRole]) {
    throw new Error("forbidden");
  }
  return role;
}

// Use in Prisma where clauses to scope properties to owned + accessible
export function propertyWhereOwnedOrAccessible(userId: string): Prisma.PropertyWhereInput {
  return {
    OR: [
      { ownerId: userId },
      { accessList: { some: { userId } } },
    ],
  };
}

export type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: PropertyRole;
  accessId?: string;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
  token: string;
};

export async function getPropertyTeam(propertyId: string): Promise<{
  owner: TeamMember | null;
  members: TeamMember[];
  invitations: PendingInvitation[];
}> {
  const [property, accesses, invitations] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: { owner: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.propertyAccess.findMany({
      where: { propertyId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { propertyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const owner: TeamMember | null = property?.owner
    ? { ...property.owner, role: "OWNER" }
    : null;

  const members: TeamMember[] = accesses.map(a => ({
    ...a.user,
    role: a.role as PropertyRole,
    accessId: a.id,
  }));

  return {
    owner,
    members,
    invitations: invitations.map(i => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
      token: i.token,
    })),
  };
}
