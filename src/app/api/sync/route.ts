import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/lib/channels/sync";
import { z } from "zod";

// Manual trigger: POST /api/sync?connectionId=xxx
// Also used by cron (secured by CRON_SECRET header)
export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const isAuthorizedCron =
      process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

    if (!isAuthorizedCron) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
      }
    }

    const connectionId = req.nextUrl.searchParams.get("connectionId");

    if (connectionId) {
      const parsed = z.string().cuid().safeParse(connectionId);
      if (!parsed.success) {
        return NextResponse.json({ error: "connectionId invalide." }, { status: 400 });
      }

      const connection = await prisma.platformConnection.findUnique({
        where: { id: parsed.data },
        include: { platform: true },
      });

      if (!connection) {
        return NextResponse.json({ error: "Connexion introuvable." }, { status: 404 });
      }

      const result = await syncConnection(connection);
      return NextResponse.json(result);
    }

    // Sync all active connections
    const connections = await prisma.platformConnection.findMany({
      where: { isActive: true, icalImportUrl: { not: null } },
      include: { platform: true },
    });

    const results = await Promise.allSettled(connections.map(c => syncConnection(c)));

    return NextResponse.json({
      total: connections.length,
      results: results.map((r, i) => {
        const base = { connectionId: connections[i]!.id, status: r.status };
        if (r.status === "fulfilled") {
          const { connectionId: _id, ...rest } = r.value;
          return { ...base, ...rest };
        }
        return { ...base, error: String(r.reason) };
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
