
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$connect();

    const roomTypeCount = await prisma.roomType.count();

    return NextResponse.json({
      success: true,
      message: "Koneksi PostgreSQL berhasil!",
      jumlahTipeKamar: roomTypeCount,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Koneksi database gagal.",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
