
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
        {
          success: false,
          message: "Kamu belum login.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesi login tidak valid atau sudah kedaluwarsa.",
        },
        { status: 401 }
      );
    }

    // Ambil informasi pengguna terbaru dari database
    const user = await prisma.user.findUnique({
      where: {
        id: Number(session.userId),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Akun tidak ditemukan.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sesi login valid.",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memeriksa sesi login.",
      },
      { status: 500 }
    );
  }
}
