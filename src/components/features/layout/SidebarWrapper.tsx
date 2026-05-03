import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "./Sidebar";
import type { User } from "next-auth";

export async function SidebarWrapper({ user }: { user: User }) {
  const session = await auth();
  if (!session?.user?.id) return <Sidebar user={user} conflictCount={0} />;

  const conflictCount = await prisma.bookingConflict.count({
    where: {
      resolvedAt: null,
      booking: { property: { ownerId: session.user.id } },
    },
  });

  return <Sidebar user={user} conflictCount={conflictCount} />;
}
