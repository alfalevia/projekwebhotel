
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET() {
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

    const payments = await prisma.reservation.findMany({
      where: {
        paymentStatus: "MENUNGGU_KONFIRMASI",
      },
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
      data: payments.map((payment) => ({
        id: payment.id,
        bookingCode: payment.bookingCode,
        paymentStatus: payment.paymentStatus,
        paymentMethod: payment.paymentMethod,
        paymentProof: payment.paymentProof,
        totalPrice: Number(payment.totalPrice),
        checkIn: payment.checkIn,
        checkOut: payment.checkOut,
        guests: payment.guests,
        createdAt: payment.createdAt,
        guest: {
          id: payment.user.id,
          name: payment.user.name,
          email: payment.user.email,
        },
        room: {
          id: payment.room.id,
          roomNumber: payment.room.roomNumber,
          roomType: payment.room.roomType.name,
        },
      })),
    });
  } catch (error) {
    console.error("Get pending payments error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil daftar pembayaran.",
      },
      { status: 500 }
    );
  }
}
