import { NextResponse } from "next/server";
import { isWebPushConfigured } from "@/lib/webpush";

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!isWebPushConfigured || !publicKey) {
    return NextResponse.json(
      { message: "Konfigurasi Web Push belum tersedia." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    publicKey,
  });
}
