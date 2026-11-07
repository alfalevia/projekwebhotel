
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

    // 2. Periksa hak akses pengguna
    const user = await prisma.user.findUnique({
      where: {
        id: Number(session.userId),
      },
      select: {
        role: true,
      },
    });

    if (!user || !["HOUSEKEEPING", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    // 3. Validasi ID kamar
    const { id } = await params;
    const roomId = Number(id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ID kamar tidak valid.",
        },
        { status: 400 }
      );
    }

    // 4. Periksa apakah kamar ditemukan
    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },
      select: {
        id: true,
        roomNumber: true,
        status: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          message: "Kamar tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 5. Pastikan kamar sedang menunggu pembersihan
    if (room.status !== "DIBERSIHKAN") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kamar hanya dapat diselesaikan jika statusnya DIBERSIHKAN.",
        },
        { status: 409 }
      );
    }

    // 6. Ubah status hanya jika masih DIBERSIHKAN
    const result = await prisma.room.updateMany({
      where: {
        id: roomId,
        status: "DIBERSIHKAN",
      },
      data: {
        status: "TERSEDIA",
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status kamar sudah berubah. Muat ulang daftar kamar.",
        },
        { status: 409 }
      );
    }

    // 7. Kirim respons berhasil
    return NextResponse.json({
      success: true,
      message: `Kamar ${room.roomNumber} selesai dibersihkan dan sekarang tersedia.`,
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        status: "TERSEDIA",
      },
    });
  } catch (error) {
    console.error("Complete housekeeping error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menyelesaikan pembersihan kamar.",
      },
      { status: 500 }
    );
  }
}
