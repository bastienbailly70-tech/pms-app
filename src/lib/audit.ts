import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  changes?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        userId,
        action,
        entity,
        entityId,
        ...(changes !== undefined
          ? { changes: changes as Prisma.InputJsonValue }
          : {}),
      },
    })
    .catch(() => undefined);
}
