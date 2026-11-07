import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

// Memeriksa apakah pengguna adalah Admin
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

// POST: Menambahkan unit kamar baru
export async function POST(request) {
  try {
    // 1. Periksa hak akses Admin
    const auth = await cekAdmin();

    if (auth.error) {
      return auth.error;
    }

    // 2. Ambil data formulir
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Format data tidak valid." },
        { status: 400 }
      );
    }

    const roomNumber =
      typeof body.roomNumber === "string"
        ? body.roomNumber.trim()
        : "";

    const floor = Number(body.floor);
    const roomTypeId = Number(body.roomTypeId);

    // 3. Validasi nomor kamar
    if (!roomNumber || roomNumber.length > 20) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor kamar wajib diisi dan maksimal 20 karakter.",
        },
        { status: 400 }
      );
    }

    // 4. Validasi lantai
    if (
      !Number.isInteger(floor) ||
      floor < 1 ||
      floor > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Lantai harus berupa angka bulat antara 1 dan 100.",
        },
        { status: 400 }
      );
    }

    // 5. Validasi ID tipe kamar
    if (!Number.isInteger(roomTypeId) || roomTypeId < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan pilih tipe kamar yang valid.",
        },
        { status: 400 }
      );
    }

    // 6. Pastikan tipe kamar tersedia
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!roomType) {
      return NextResponse.json(
        {
          success: false,
          message: "Tipe kamar tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // 7. Periksa nomor kamar duplikat
    const existingRoom = await prisma.room.findUnique({
      where: { roomNumber },
      select: { id: true },
    });

    if (existingRoom) {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor kamar sudah digunakan.",
        },
        { status: 409 }
      );
    }

    // 8. Simpan unit kamar ke database
    const room = await prisma.room.create({
      data: {
        roomNumber,
        floor,
        roomTypeId,
        status: "TERSEDIA",
      },
      include: {
        roomType: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
          },
        },
      },
    });

    // 9. Kirim hasil penyimpanan
    return NextResponse.json(
      {
        success: true,
        message: "Unit kamar berhasil ditambahkan.",
        data: {
          id: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          status: room.status,
          roomType: {
            id: room.roomType.id,
            name: room.roomType.name,
            price: room.roomType.price.toString(),
            capacity: room.roomType.capacity,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Menangani nomor kamar duplikat akibat request bersamaan
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Nomor kamar sudah digunakan.",
        },
        { status: 409 }
      );
    }

    console.error("Admin create room error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal menambahkan unit kamar.",
      },
      { status: 500 }
    );
  }
}