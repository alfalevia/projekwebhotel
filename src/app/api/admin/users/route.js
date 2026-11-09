
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

// Mengambil daftar pengguna
export async function GET() {
  try {
    const auth = await cekAdmin();

    if (auth.error) return auth.error;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Admin get users error:", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

// Menambahkan pengguna
export async function POST(request) {
  try {
    const auth = await cekAdmin();

    if (auth.error) return auth.error;

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() || null : null;
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role : "TAMU";

    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, message: "Nama wajib diisi dan maksimal 100 karakter." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Role pengguna tidak valid." },
        { status: 400 }
      );
    }

    if (phone && phone.length > 30) {
      return NextResponse.json(
        { success: false, message: "Nomor telepon maksimal 30 karakter." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email sudah terdaftar." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pengguna berhasil ditambahkan.",
        data: user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);

    return NextResponse.json(
      { success: false, message: "Gagal menambahkan pengguna." },
      { status: 500 }
    );
  }
}
