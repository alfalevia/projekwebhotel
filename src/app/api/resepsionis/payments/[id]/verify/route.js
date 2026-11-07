
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("nara_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { id: true, role: true },
    });

    if (!user || !["RESEPSIONIS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const reservationId = Number(id);

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID reservasi tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (!["TERIMA", "TOLAK"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Pilihan verifikasi tidak valid." },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        bookingCode: true,
        paymentStatus: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (reservation.paymentStatus !== "MENUNGGU_KONFIRMASI") {
      return NextResponse.json(
        {
          success: false,
          message: "Pembayaran ini tidak sedang menunggu konfirmasi.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        paymentStatus: "MENUNGGU_KONFIRMASI",
      },
      data:
        action === "TERIMA"
          ? {
              paymentStatus: "LUNAS",
              paidAt: new Date(),
            }
          : {
              paymentStatus: "DITOLAK",
              paidAt: null,
            },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Status pembayaran sudah berubah. Muat ulang data.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "TERIMA"
          ? `Pembayaran ${reservation.bookingCode} berhasil dikonfirmasi.`
          : `Pembayaran ${reservation.bookingCode} ditolak.`,
      data: {
        id: reservation.id,
        bookingCode: reservation.bookingCode,
        paymentStatus: action === "TERIMA" ? "LUNAS" : "DITOLAK",
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal memverifikasi pembayaran.",
      },
      { status: 500 }
    );
  }
}
