
import prisma from "./prisma.js";
import webpush, { isWebPushConfigured } from "./webpush.js";

// Mengirim notifikasi ke satu perangkat.
export async function sendPushToSubscription(subscription, payload) {
  if (!isWebPushConfigured) {
    throw new Error("Konfigurasi Web Push belum tersedia.");
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (error) {
    // Hapus subscription yang sudah tidak berlaku.
    if (error.statusCode === 404 || error.statusCode === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { id: subscription.id },
      });

      return { success: false, removed: true };
    }

    // Error sementara diteruskan agar worker dapat melakukan retry.
    throw error;
  }
}

// Fungsi untuk pengiriman langsung jika masih diperlukan.
export async function sendPushNotification(userId, payload) {
  if (!isWebPushConfigured) {
    console.warn("Web Push belum dikonfigurasi.");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  for (const subscription of subscriptions) {
    try {
      await sendPushToSubscription(subscription, payload);
    } catch (error) {
      console.error("GAGAL MENGIRIM PUSH:", error);
    }
  }
}
