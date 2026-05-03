import { getBoss, JOB_NAMES } from "./queue";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/lib/channels/sync";
import type { Job } from "pg-boss";

let registered = false;

export async function registerSyncWorker() {
  if (registered) return;
  registered = true;

  const boss = await getBoss();

  // Worker: sync a single connection (dispatched individually for retry isolation)
  await boss.work(
    JOB_NAMES.SYNC_CONNECTION,
    async (jobs: Job<{ connectionId: string }>[]) => {
      for (const job of jobs) {
        const { connectionId } = job.data;

        const connection = await prisma.platformConnection.findUnique({
          where: { id: connectionId },
          include: { platform: true },
        });

        if (!connection || !connection.isActive) continue;
        await syncConnection(connection);
      }
    }
  );

  // Orchestrator: fanout — dispatch one job per active connection
  await boss.work(JOB_NAMES.SYNC_ALL, async () => {
    const connections = await prisma.platformConnection.findMany({
      where: { isActive: true, icalImportUrl: { not: null } },
      select: { id: true },
    });

    for (const { id } of connections) {
      await boss.send(JOB_NAMES.SYNC_CONNECTION, { connectionId: id }, {
        retryLimit: 3,
        retryDelay: 1,
        retryBackoff: true,
      });
    }

    console.log(`[sync-worker] Dispatched ${connections.length} sync jobs`);
  });
}
