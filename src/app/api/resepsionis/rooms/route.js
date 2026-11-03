
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
      select: { role: true },
    });

    if (!user || !["RESEPSIONIS", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

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
      data: rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
        roomTypeId: room.roomTypeId,
        roomType: room.roomType.name,
        capacity: room.roomType.capacity,
        price: Number(room.roomType.price),
      })),
    });
  } catch (error) {
    console.error("Get receptionist rooms error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil daftar kamar.",
      },
      { status: 500 }
    );
  }
}
