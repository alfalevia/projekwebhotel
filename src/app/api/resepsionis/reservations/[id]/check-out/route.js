
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function PATCH(request, { params }) {
  try {
    // 1. Periksa sesi login
    const cookieStore = await cookies();
    const token = cookieStore.get("nara_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi login tidak valid.",
        },
        { status: 401 }
      );
    }

    // 2. Periksa hak akses
    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { role: true },
    });

    if (!user || !["RESEPSIONIS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    // 3. Validasi ID reservasi
    const { id } = await params;
    const reservationId = Number(id);

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ID reservasi tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil data reservasi dan kamar
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: true },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservasi tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 5. Pastikan reservasi sedang CHECK_IN
    if (reservation.status !== "CHECK_IN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Check-out hanya dapat dilakukan pada reservasi CHECK_IN.",
        },
        { status: 409 }
      );
    }

    if (!reservation.roomId || !reservation.room) {
      return NextResponse.json(
        {
          success: false,
          message: "Reservasi belum memiliki kamar.",
        },
        { status: 409 }
      );
    }

    // 6. Perbarui reservasi dan kamar dalam satu transaksi
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: "CHECK_IN",
        },
        data: {
          status: "CHECK_OUT",
        },
      });

      if (result.count === 0) {
        throw new Error("RESERVATION_STATUS_CHANGED");
      }

      // Periksa apakah masih ada tamu lain yang menempati kamar
      const activeReservation = await tx.reservation.findFirst({
        where: {
          id: { not: reservationId },
          roomId: reservation.roomId,
          status: "CHECK_IN",
        },
        select: {
          id: true,
        },
      });

      // Jika tidak ada tamu lain, kamar masuk antrean pembersihan
      if (!activeReservation) {
        await tx.room.update({
          where: {
            id: reservation.roomId,
          },
          data: {
            status: "DIBERSIHKAN",
          },
        });
      }

      // Ambil data reservasi terbaru
      return tx.reservation.findUnique({
        where: {
          id: reservationId,
        },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          room: {
            select: {
              roomNumber: true,
              status: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Check-out reservasi ${updated.bookingCode} berhasil. Kamar masuk antrean pembersihan.`,
      data: updated,
    });
  } catch (error) {
    if (error.message === "RESERVATION_STATUS_CHANGED") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status reservasi sudah berubah. Muat ulang data.",
        },
        { status: 409 }
      );
    }

    console.error("Check-out reservation error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal memproses check-out. Periksa Terminal VS Code.",
      },
      { status: 500 }
    );
  }
}
