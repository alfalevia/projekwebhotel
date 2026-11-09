
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const roomTypes = await prisma.roomType.findMany({
      orderBy: {
        price: "asc",
      },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            status: true,
          },
          orderBy: {
            roomNumber: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: roomTypes.map((roomType) => ({
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        capacity: roomType.capacity,
        price: roomType.price.toString(),
        facilities: roomType.facilities || [],
        imageUrl: roomType.imageUrl || null,
        rooms: roomType.rooms,
      })),
    });
  } catch (error) {
    console.error("Get room types error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data tipe kamar.",
      },
      {
        status: 500,
      }
    );
  }
}
