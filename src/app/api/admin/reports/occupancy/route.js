
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

function getDateString(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function calculateRate(occupied, total) {
  return total > 0
    ? Number(((occupied / total) * 100).toFixed(2))
    : 0;
}

export async function GET(request) {
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

    const admin = await prisma.user.findUnique({
      where: { id: Number(session.userId) },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses hanya untuk admin." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const today = getDateString(new Date());

    const startValue =
      searchParams.get("startDate") || `${today.slice(0, 7)}-01`;
    const endValue = searchParams.get("endDate") || today;

    const startDate = parseDate(startValue);
    const endDate = parseDate(endValue);

    if (!startDate || !endDate || endDate < startDate) {
      return NextResponse.json(
        { success: false, message: "Periode tanggal tidak valid." },
        { status: 400 }
      );
    }

    const dayCount =
      Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

    if (dayCount > 31) {
      return NextResponse.json(
        { success: false, message: "Maksimal periode laporan adalah 31 hari." },
        { status: 400 }
      );
    }

    const endExclusive = addDays(endDate, 1);

    const rooms = await prisma.room.findMany({
      select: {
        id: true,
        roomNumber: true,
        floor: true,
        status: true,
        roomTypeId: true,
        roomType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        roomNumber: "asc",
      },
    });

    const reservations = await prisma.reservation.findMany({
      where: {
        status: { not: "DIBATALKAN" },
        checkIn: { lt: endExclusive },
        checkOut: { gt: startDate },
      },
      select: {
        roomId: true,
        checkIn: true,
        checkOut: true,
      },
    });

    const totalRooms = rooms.length;

    const occupiedRooms = rooms.filter(
      (room) => room.status === "TERISI"
    ).length;

    const availableRooms = rooms.filter(
      (room) => room.status === "TERSEDIA"
    ).length;

    const cleaningRooms = rooms.filter(
      (room) => room.status === "DIBERSIHKAN"
    ).length;

    const maintenanceRooms = rooms.filter(
      (room) => room.status === "PERBAIKAN"
    ).length;

    const roomTypeMap = new Map();

    for (const room of rooms) {
      const typeId = room.roomType.id;

      if (!roomTypeMap.has(typeId)) {
        roomTypeMap.set(typeId, {
          id: typeId,
          roomTypeId: typeId,
          name: room.roomType.name,
          total: 0,
          totalRooms: 0,
          occupied: 0,
          occupiedRooms: 0,
          available: 0,
          cleaning: 0,
          maintenance: 0,
        });
      }

      const item = roomTypeMap.get(typeId);
      item.total += 1;
      item.totalRooms += 1;

      if (room.status === "TERISI") {
        item.occupied += 1;
        item.occupiedRooms += 1;
      }

      if (room.status === "TERSEDIA") item.available += 1;
      if (room.status === "DIBERSIHKAN") item.cleaning += 1;
      if (room.status === "PERBAIKAN") item.maintenance += 1;
    }

    const roomTypes = Array.from(roomTypeMap.values()).map((item) => ({
      ...item,
      occupancyRate: calculateRate(item.occupiedRooms, item.totalRooms),
    }));

    const daily = [];

    for (let index = 0; index < dayCount; index += 1) {
      const currentDate = addDays(startDate, index);
      const nextDate = addDays(currentDate, 1);

      const occupiedRoomIds = new Set(
        reservations
          .filter(
            (reservation) =>
              reservation.checkIn < nextDate &&
              reservation.checkOut > currentDate
          )
          .map((reservation) => reservation.roomId)
      );

      const occupiedCount = occupiedRoomIds.size;

      daily.push({
        date: currentDate.toISOString().slice(0, 10),
        totalRooms,
        occupiedRooms: occupiedCount,
        occupancyRate: calculateRate(occupiedCount, totalRooms),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Laporan okupansi berhasil diambil.",
      data: {
        period: {
          startDate: startValue,
          endDate: endValue,
        },
        summary: {
          totalRooms,
          occupiedRooms,
          availableRooms,
          cleaningRooms,
          maintenanceRooms,
          occupancyRate: calculateRate(occupiedRooms, totalRooms),
        },
        roomTypes,
        daily,
        rooms,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("OCCUPANCY_REPORT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil laporan okupansi hotel.",
      },
      { status: 500 }
    );
  }
}
