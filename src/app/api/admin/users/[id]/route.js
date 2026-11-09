
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

const ROLES = ["TAMU", "RESEPSIONIS", "HOUSEKEEPING", "ADMIN"];

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

function validasiId(id) {
  const userId = Number(id);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
}

// Mengubah data pengguna
export async function PATCH(request, { params }) {
  try {
    const auth = await cekAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const userId = validasiId(id);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 100
      ) {
        return NextResponse.json(
          { success: false, message: "Nama tidak valid." },
          { status: 400 }
        );
      }
      data.name = body.name.trim();
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string") {
        return NextResponse.json(
          { success: false, message: "Email tidak valid." },
          { status: 400 }
        );
      }

      const email = body.email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { success: false, message: "Format email tidak valid." },
          { status: 400 }
        );
      }

      const duplicate = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Email sudah digunakan pengguna lain." },
          { status: 409 }
        );
      }

      data.email = email;
    }

    if (body.phone !== undefined) {
      if (
        body.phone !== null &&
        (typeof body.phone !== "string" || body.phone.trim().length > 30)
      ) {
        return NextResponse.json(
          { success: false, message: "Nomor telepon tidak valid." },
          { status: 400 }
        );
      }

      data.phone =
        typeof body.phone === "string" ? body.phone.trim() || null : null;
    }

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json(
          { success: false, message: "Role tidak valid." },
          { status: 400 }
        );
      }

      if (existingUser.id === auth.user.id && body.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, message: "Role akun Admin yang sedang digunakan tidak dapat diturunkan." },
          { status: 400 }
        );
      }

      if (existingUser.role === "ADMIN" && body.role !== "ADMIN") {
        const adminCount = await prisma.user.count({
          where: { role: "ADMIN" },
        });

        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, message: "Tidak dapat mengubah role Admin terakhir." },
            { status: 400 }
          );
        }
      }

      data.role = body.role;
    }

    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return NextResponse.json(
          { success: false, message: "Password baru minimal 8 karakter." },
          { status: 400 }
        );
      }

      data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "Tidak ada data yang diubah." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Admin update user error:", error);

    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data pengguna." },
      { status: 500 }
    );
  }
}

// Menghapus pengguna
export async function DELETE(request, { params }) {
  try {
    const auth = await cekAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const userId = validasiId(id);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { success: false, message: "Akun Admin yang sedang digunakan tidak dapat dihapus." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Admin terakhir tidak dapat dihapus." },
          { status: 400 }
        );
      }
    }

    const reservationCount = await prisma.reservation.count({
      where: { userId },
    });

    if (reservationCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengguna memiliki riwayat reservasi sehingga tidak dapat dihapus.",
        },
        { status: 409 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Pengguna berhasil dihapus.",
    });
  } catch (error) {
    console.error("Admin delete user error:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
