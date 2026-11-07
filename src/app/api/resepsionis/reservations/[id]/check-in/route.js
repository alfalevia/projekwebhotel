
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

    // 2. Periksa hak akses
    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { role: true },
    });

    if (!user || !["RESEPSIONIS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    // 3. Validasi ID reservasi
    const { id } = await params;
    const reservationId = Number(id);

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return NextResponse.json(
        { success: false, message: "ID reservasi tidak valid." },
        { status: 400 }
      );
    }

    // 4. Ambil data reservasi beserta kamar
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        room: {
          include: { roomType: true },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan." },
        { status: 404 }
      );
    }

    // 5. Reservasi harus sudah dikonfirmasi
    if (reservation.status !== "DIKONFIRMASI") {
      return NextResponse.json(
        {
          success: false,
          message: "Check-in hanya dapat dilakukan pada reservasi yang sudah dikonfirmasi.",
        },
        { status: 409 }
      );
    }

    // 6. Periksa kapasitas kamar
    if (reservation.room.roomType.capacity < reservation.guests) {
      return NextResponse.json(
        {
          success: false,
          message: "Kapasitas kamar tidak mencukupi jumlah tamu.",
        },
        { status: 409 }
      );
    }

    // 7. Periksa bentrok reservasi aktif pada kamar yang sama
    const conflict = await prisma.reservation.findFirst({
      where: {
        id: { not: reservation.id },
        roomId: reservation.roomId,
        status: "CHECK_IN",
      },
      select: { bookingCode: true },
    });

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          message: `Kamar masih digunakan oleh reservasi ${conflict.bookingCode}.`,
        },
        { status: 409 }
      );
    }

    // 8. Ubah status reservasi dan kamar secara bersamaan
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.updateMany({
        where: {
          id: reservationId,
          status: "DIKONFIRMASI",
        },
        data: { status: "CHECK_IN" },
      });

      if (result.count === 0) {
        throw new Error("RESERVATION_STATUS_CHANGED");
      }

      await tx.room.update({
        where: { id: reservation.roomId },
        data: { status: "TERISI" },
      });

      return tx.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          room: {
            select: { roomNumber: true },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Check-in reservasi ${updated.bookingCode} berhasil. Kamar ${updated.room.roomNumber} sekarang berstatus TERISI.`,
      data: updated,
    });
  } catch (error) {
    if (error.message === "RESERVATION_STATUS_CHANGED") {
      return NextResponse.json(
        {
          success: false,
          message: "Status reservasi sudah berubah. Muat ulang data.",
        },
        { status: 409 }
      );
    }

    console.error("Check-in reservation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses check-in. Periksa Terminal VS Code.",
      },
      { status: 500 }
    );
  }
}
