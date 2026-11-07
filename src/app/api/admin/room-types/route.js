
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

async function cekAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nara_session")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 }
      ),
    };
  }

  const session = await verifySession(token);

  if (!session?.userId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Sesi login tidak valid." },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.userId) },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { success: false, message: "Akses khusus Admin." },
        { status: 403 }
      ),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const auth = await cekAdmin();

    if (auth.error) {
      return auth.error;
    }

    const roomTypes = await prisma.roomType.findMany({
      include: {
        rooms: {
          orderBy: {
            roomNumber: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const data = roomTypes.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      capacity: type.capacity,
      price: type.price.toString(),
      rooms: type.rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        status: room.status,
      })),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Admin get room types error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil data tipe kamar.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await cekAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
    const capacity = Number(body.capacity);
    const price = Number(body.price);

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Nama tipe kamar wajib diisi." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
      return NextResponse.json(
        { success: false, message: "Kapasitas harus antara 1 dan 20." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, message: "Harga kamar tidak valid." },
        { status: 400 }
      );
    }

    const existing = await prisma.roomType.findFirst({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Nama tipe kamar sudah digunakan." },
        { status: 409 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        name,
        description,
        capacity,
        price,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tipe kamar berhasil ditambahkan.",
        data: {
          id: roomType.id,
          name: roomType.name,
          description: roomType.description,
          capacity: roomType.capacity,
          price: roomType.price.toString(),
          rooms: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create room type error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menambahkan tipe kamar.",
      },
      { status: 500 }
    );
  }
}
