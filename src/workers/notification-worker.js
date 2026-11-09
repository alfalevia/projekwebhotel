import "dotenv/config";
import prisma from "../lib/prisma.js";
import {
  getNotificationBoss,
  PUSH_QUEUE_NAME,
} from "../lib/notification-queue.js";
import { sendPushToSubscription } from "../lib/send-push-notification.js";

async function startWorker() {
  const boss = await getNotificationBoss();

  await boss.work(
    PUSH_QUEUE_NAME,
    {
      batchSize: 1,
      pollingIntervalSeconds: 2,
    },
    async (jobs) => {
      for (const job of jobs) {
        const { subscriptionId, payload } = job.data;

        const subscription = await prisma.pushSubscription.findUnique({
          where: { id: subscriptionId },
        });

        if (!subscription) {
          console.log("Subscription tidak ditemukan:", subscriptionId);
          continue;
        }

        await sendPushToSubscription(subscription, payload);

        console.log("Notifikasi berhasil dikirim:", job.id);
      }
    }
  );

  console.log("Background Worker NARA HOTEL aktif.");
}

startWorker().catch((error) => {
  console.error("BACKGROUND WORKER ERROR:", error);
  process.exitCode = 1;
});