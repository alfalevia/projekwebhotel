
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
      select: { role: true },
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
    const roomId = Number(body.roomId);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return NextResponse.json(
        { success: false, message: "Pilih kamar yang valid." },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        bookingCode: true,
        roomId: true,
        checkIn: true,
        checkOut: true,
        guests: true,
        status: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!["DIKONFIRMASI", "MENUNGGU"].includes(reservation.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Alokasi kamar hanya bisa dilakukan pada reservasi yang belum check-in atau check-out.",
        },
        { status: 409 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { roomType: true },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, message: "Kamar tidak ditemukan." },
        { status: 404 }
      );
    }

    if (room.status !== "TERSEDIA" && room.id !== reservation.roomId) {
      return NextResponse.json(
        { success: false, message: "Kamar tidak berstatus tersedia." },
        { status: 409 }
      );
    }

    if (room.roomType.capacity < reservation.guests) {
      return NextResponse.json(
        {
          success: false,
          message: `Kapasitas kamar hanya ${room.roomType.capacity} orang, sedangkan tamu berjumlah ${reservation.guests} orang.`,
        },
        { status: 409 }
      );
    }

    const conflict = await prisma.reservation.findFirst({
      where: {
        id: { not: reservation.id },
        roomId,
        status: { in: ["DIKONFIRMASI", "CHECK_IN"] },
        checkIn: { lt: reservation.checkOut },
        checkOut: { gt: reservation.checkIn },
      },
      select: { id: true, bookingCode: true },
    });

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          message: `Kamar sudah digunakan oleh reservasi ${conflict.bookingCode} pada tanggal tersebut.`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { roomId },
      select: {
        id: true,
        bookingCode: true,
        roomId: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reservasi ${updated.bookingCode} berhasil dialokasikan ke kamar ${room.roomNumber}.`,
      data: updated,
    });
  } catch (error) {
    console.error("Allocate receptionist room error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengalokasikan kamar. Periksa Terminal VS Code.",
      },
      { status: 500 }
    );
  }
}
