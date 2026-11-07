
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request, { params }) {
  try {
    // 1. Periksa sesi login
    const cookieStore = await cookies();
    const token = cookieStore.get("nara_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    const userId = Number(session?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    // 2. Validasi ID reservasi
    const { id } = await params;
    const reservationId = Number(id);

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID reservasi tidak valid." },
        { status: 400 }
      );
    }

    // 3. Ambil file dari FormData
    const formData = await request.formData();
    const file = formData.get("paymentProof");

    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Silakan pilih bukti transfer." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format file harus JPG, PNG, atau WebP.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran file maksimal 5 MB.",
        },
        { status: 400 }
      );
    }

    // 4. Cari reservasi milik pengguna
    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationId,
        userId,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 5. Pastikan pembayaran transfer sedang menunggu konfirmasi
    if (
      reservation.status === "DIBATALKAN" ||
      reservation.paymentMethod !== "TRANSFER_BANK" ||
      reservation.paymentStatus !== "MENUNGGU_KONFIRMASI"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bukti hanya dapat diunggah untuk pembayaran transfer yang sedang menunggu konfirmasi.",
        },
        { status: 409 }
      );
    }

    // 6. Ubah gambar menjadi Data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const paymentProof = `data:${file.type};base64,${base64}`;

    // 7. Simpan bukti ke database
    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        userId,
        paymentMethod: "TRANSFER_BANK",
        paymentStatus: "MENUNGGU_KONFIRMASI",
        status: { not: "DIBATALKAN" },
      },
      data: {
        paymentProof,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Status pembayaran berubah. Silakan muat ulang halaman.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bukti transfer berhasil diunggah.",
    });
  } catch (error) {
    console.error("Upload payment proof error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengunggah bukti transfer.",
      },
      { status: 500 }
    );
  }
}
