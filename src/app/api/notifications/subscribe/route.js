import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nara_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        { message: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const subscription = body.subscription;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { message: "Data langganan notifikasi tidak valid." },
        { status: 400 }
      );
    }

    const saved = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        userId: session.userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: session.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({
      message: "Langganan notifikasi berhasil disimpan.",
      id: saved.id,
    });
  } catch (error) {
    console.error("SUBSCRIBE NOTIFICATION ERROR:", error);

    return NextResponse.json(
      { message: "Gagal menyimpan langganan notifikasi." },
      { status: 500 }
    );
  }
}
