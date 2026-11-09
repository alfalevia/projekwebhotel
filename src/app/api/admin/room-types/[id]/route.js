
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
    select: { id: true, role: true },
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

function validasiFasilitas(facilities) {
  if (
    !Array.isArray(facilities) ||
    facilities.some(
      (item) => typeof item !== "string" || !item.trim()
    )
  ) {
    return {
      valid: false,
      message: "Daftar fasilitas tidak valid.",
    };
  }

  return {
    valid: true,
    data: [...new Set(facilities.map((item) => item.trim()))],
  };
}

function validasiFoto(imageUrl) {
  if (imageUrl === null || imageUrl === "") {
    return { valid: true, data: null };
  }

  if (typeof imageUrl !== "string" || imageUrl.length > 2048) {
    return {
      valid: false,
      message: "Alamat foto tidak valid.",
    };
  }

  try {
    const url = new URL(imageUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        valid: false,
        message: "URL foto harus menggunakan HTTP atau HTTPS.",
      };
    }

    return { valid: true, data: imageUrl.trim() };
  } catch {
    return {
      valid: false,
      message: "URL foto tidak valid.",
    };
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await cekAdmin();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const roomTypeId = Number(id);

    if (!Number.isInteger(roomTypeId) || roomTypeId < 1) {
      return NextResponse.json(
        { success: false, message: "ID tipe kamar tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existingRoomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!existingRoomType) {
      return NextResponse.json(
        { success: false, message: "Tipe kamar tidak ditemukan." },
        { status: 404 }
      );
    }

    const data = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { success: false, message: "Nama tipe kamar tidak boleh kosong." },
          { status: 400 }
        );
      }

      const name = body.name.trim();

      const duplicate = await prisma.roomType.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: { id: roomTypeId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Nama tipe kamar sudah digunakan." },
          { status: 409 }
        );
      }

      data.name = name;
    }

    if (body.description !== undefined) {
      if (
        body.description !== null &&
        typeof body.description !== "string"
      ) {
        return NextResponse.json(
          { success: false, message: "Deskripsi tidak valid." },
          { status: 400 }
        );
      }

      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);

      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
        return NextResponse.json(
          {
            success: false,
            message: "Kapasitas harus berupa bilangan bulat antara 1 dan 20.",
          },
          { status: 400 }
        );
      }

      data.capacity = capacity;
    }

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isFinite(price) || price <= 0 || price > 1000000000) {
        return NextResponse.json(
          { success: false, message: "Harga kamar tidak valid." },
          { status: 400 }
        );
      }

      data.price = price;
    }

    if (body.facilities !== undefined) {
      const fasilitas = validasiFasilitas(body.facilities);

      if (!fasilitas.valid) {
        return NextResponse.json(
          { success: false, message: fasilitas.message },
          { status: 400 }
        );
      }

      data.facilities = fasilitas.data;
    }

    if (body.imageUrl !== undefined) {
      const foto = validasiFoto(body.imageUrl);

      if (!foto.valid) {
        return NextResponse.json(
          { success: false, message: foto.message },
          { status: 400 }
        );
      }

      data.imageUrl = foto.data;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diubah." },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.update({
      where: { id: roomTypeId },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Tipe kamar berhasil diperbarui.",
      data: {
        id: roomType.id,
        name: roomType.name,
        description: roomType.description,
        capacity: roomType.capacity,
        price: roomType.price.toString(),
        facilities: roomType.facilities,
        imageUrl: roomType.imageUrl,
      },
    });
  } catch (error) {
    console.error("Admin update room type error:", error);

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui tipe kamar." },
      { status: 500 }
    );
  }
}
