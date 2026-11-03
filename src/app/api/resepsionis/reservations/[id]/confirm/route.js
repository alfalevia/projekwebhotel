
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

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, bookingCode: true, status: true },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, message: "Reservasi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (reservation.status !== "MENUNGGU") {
      return NextResponse.json(
        {
          success: false,
          message: `Reservasi berstatus ${reservation.status} dan tidak dapat dikonfirmasi.`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.reservation.updateMany({
      where: {
        id: reservationId,
        status: "MENUNGGU",
      },
      data: { status: "DIKONFIRMASI" },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Status reservasi sudah berubah. Muat ulang data.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Reservasi ${reservation.bookingCode} berhasil dikonfirmasi.`,
      data: {
        id: reservation.id,
        bookingCode: reservation.bookingCode,
        status: "DIKONFIRMASI",
      },
    });
  } catch (error) {
    console.error("Confirm reservation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengonfirmasi reservasi. Periksa Terminal VS Code.",
      },
      { status: 500 }
    );
  }
}
