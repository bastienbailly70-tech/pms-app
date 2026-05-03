import { PgBoss } from "pg-boss";

const globalForBoss = globalThis as unknown as { boss: PgBoss | undefined };

let bossPromise: Promise<PgBoss> | null = null;

export function getBoss(): Promise<PgBoss> {
  if (bossPromise) return bossPromise;

  bossPromise = (async () => {
    if (globalForBoss.boss) return globalForBoss.boss;

    const boss = new PgBoss({ connectionString: process.env.DATABASE_URL! });

    boss.on("error", (err: unknown) => console.error("[pg-boss]", err));
    await boss.start();

    if (process.env.NODE_ENV !== "production") globalForBoss.boss = boss;
    return boss;
  })();

  return bossPromise;
}

export const JOB_NAMES = {
  SYNC_CONNECTION: "sync-connection",
  SYNC_ALL: "sync-all-connections",
} as const;

export async function scheduleSyncAll() {
  const boss = await getBoss();
  await boss.schedule(JOB_NAMES.SYNC_ALL, "*/20 * * * *", {}, { singletonKey: "sync-all" });
}
