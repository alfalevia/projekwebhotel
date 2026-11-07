
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

    // 3. Ambil data pembayaran
    const contentType = request.headers.get("content-type") || "";
    let paymentMethod;
    let paymentProof = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      paymentMethod = formData.get("paymentMethod");
      const file = formData.get("paymentProof");

      if (file && typeof file !== "string" && file.size > 0) {
        if (!ALLOWED_TYPES[file.type]) {
          return NextResponse.json(
            {
              success: false,
              message: "Format bukti harus JPG, PNG, atau WebP.",
            },
            { status: 400 }
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              success: false,
              message: "Ukuran bukti pembayaran maksimal 5 MB.",
            },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        paymentProof = `data:${file.type};base64,${base64}`;
      }
    } else {
      const body = await request.json();
      paymentMethod = body.paymentMethod;
    }

    if (!["TRANSFER_BANK", "TUNAI"].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: "Metode pembayaran tidak valid." },
        { status: 400 }
      );
    }

    // 4. Transfer bank wajib menyertakan bukti
    if (paymentMethod === "TRANSFER_BANK" && !paymentProof) {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan unggah bukti transfer terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    // 5. Cari reservasi milik pengguna
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

    // 6. Periksa status reservasi
    if (reservation.status === "DIBATALKAN") {
      return NextResponse.json(
        {
          success: false,
          message: "Reservasi yang dibatalkan tidak dapat dibayar.",
        },
        { status: 409 }
      );
    }

    if (reservation.paymentStatus === "LUNAS") {
      return NextResponse.json(
        { success: false, message: "Reservasi ini sudah lunas." },
        { status: 409 }
      );
    }

    if (reservation.paymentStatus === "MENUNGGU_KONFIRMASI") {
      return NextResponse.json(
        {
          success: false,
          message: "Pembayaran sedang menunggu konfirmasi petugas.",
        },
        { status: 409 }
      );
    }

    // 7. Simpan pengajuan pembayaran dan bukti
    const updatedReservation = await prisma.reservation.update({
      where: {
        id: reservationId,
      },
      data: {
        paymentMethod,
        paymentStatus: "MENUNGGU_KONFIRMASI",
        paymentProof,
        paidAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        paymentMethod === "TRANSFER_BANK"
          ? "Bukti transfer berhasil dikirim. Silakan menunggu pemeriksaan petugas."
          : "Pengajuan pembayaran tunai berhasil. Silakan menunggu konfirmasi petugas.",
      data: {
        id: updatedReservation.id,
        bookingCode: updatedReservation.bookingCode,
        totalPrice: Number(updatedReservation.totalPrice),
        paymentMethod: updatedReservation.paymentMethod,
        paymentStatus: updatedReservation.paymentStatus,
        paymentProof: Boolean(updatedReservation.paymentProof),
      },
    });
  } catch (error) {
    console.error("Submit payment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengajukan pembayaran.",
      },
      { status: 500 }
    );
  }
}
