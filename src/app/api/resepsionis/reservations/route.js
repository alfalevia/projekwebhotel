
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET() {
  try {
    // Periksa sesi login
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

    // Pastikan pengguna adalah resepsionis atau admin
    const user = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { id: true, role: true },
    });

    if (!user || !["RESEPSIONIS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak. Khusus resepsionis dan admin.",
        },
        { status: 403 }
      );
    }

    // Ambil seluruh reservasi beserta data tamu dan kamar
    const reservations = await prisma.reservation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        room: {
          include: {
            roomType: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: reservations.map((reservation) => ({
        id: reservation.id,
        bookingCode: reservation.bookingCode,
        status: reservation.status,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        guests: reservation.guests,
        totalPrice: Number(reservation.totalPrice),
        createdAt: reservation.createdAt,
        guest: {
          id: reservation.user.id,
          name: reservation.user.name,
          email: reservation.user.email,
        },
        room: {
          id: reservation.room.id,
          roomNumber: reservation.room.roomNumber,
          roomType: reservation.room.roomType.name,
        },
      })),
    });
  } catch (error) {
    console.error("Get receptionist reservations error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil seluruh data reservasi.",
      },
      { status: 500 }
    );
  }
}
