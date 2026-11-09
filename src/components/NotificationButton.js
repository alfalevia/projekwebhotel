"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function NotificationButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setMessage("Browser tidak mendukung notifikasi Web Push.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Izin notifikasi belum diberikan.");
        return;
      }

      const keyResponse = await fetch("/api/notifications/vapid-public-key");
      const keyResult = await keyResponse.json();

      if (!keyResponse.ok || !keyResult.publicKey) {
        throw new Error(keyResult.message || "Gagal mengambil VAPID Public Key.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");

      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyResult.publicKey),
        });
      }

      const saveResponse = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveResult.message || "Gagal menyimpan langganan notifikasi.");
      }

      setMessage("Notifikasi berhasil diaktifkan.");
    } catch (error) {
      console.error("Aktivasi notifikasi error:", error);
      setMessage(error.message || "Gagal mengaktifkan notifikasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={enableNotifications}
        disabled={loading}
        className="rounded-full border border-[#E9C69D] bg-[#6B452D]/80 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#4B3020] disabled:opacity-50"
      >
        {loading ? "Mengaktifkan..." : "Aktifkan Notifikasi"}
      </button>

      {message && (
        <span className="max-w-48 text-[10px] text-[#FFF4E7]">
          {message}
        </span>
      )}
    </div>
  );
}
