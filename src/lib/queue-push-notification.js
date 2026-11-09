import prisma from "./prisma.js";
import {
  getNotificationBoss,
  PUSH_QUEUE_NAME,
} from "./notification-queue.js";

export async function queuePushNotification(userId, payload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true },
  });

  if (subscriptions.length === 0) {
    console.log("Pengguna belum memiliki perangkat berlangganan push.");
    return [];
  }

  const boss = await getNotificationBoss();
  const jobIds = [];

  for (const subscription of subscriptions) {
    const jobId = await boss.send(PUSH_QUEUE_NAME, {
      subscriptionId: subscription.id,
      payload,
    });

    if (jobId) {
      jobIds.push(jobId);
    }
  }

  console.log(
    `Berhasil memasukkan ${jobIds.length} notifikasi ke antrean.`
  );

  return jobIds;
}