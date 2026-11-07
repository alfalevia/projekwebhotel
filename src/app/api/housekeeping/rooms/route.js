
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export async function GET() {
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

    // 3. Ambil seluruh daftar kamar
    const rooms = await prisma.room.findMany({
      include: {
        roomType: true,
      },
      orderBy: {
        roomNumber: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daftar kamar berhasil diambil.",
      data: rooms,
    });
  } catch (error) {
    console.error("Housekeeping rooms error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil daftar kamar.",
      },
      { status: 500 }
    );
  }
}
