import { PgBoss } from "pg-boss";

export const PUSH_QUEUE_NAME = "push-notifications";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const globalForPgBoss = globalThis;

const boss =
  globalForPgBoss.pgBoss ||
  new PgBoss({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForPgBoss.pgBoss = boss;
}

boss.on("error", (error) => {
  console.error("PG-BOSS ERROR:", error);
});

let startPromise;

export async function getNotificationBoss() {
  if (!startPromise) {
    startPromise = (async () => {
      await boss.start();

      await boss.createQueue(PUSH_QUEUE_NAME, {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        retryDelayMax: 300,
        expireInSeconds: 120,
        deleteAfterSeconds: 604800,
      });

      console.log("Antrean notifikasi siap.");

      return boss;
    })().catch((error) => {
      startPromise = null;
      throw error;
    });
  }

  return startPromise;
}