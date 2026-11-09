
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

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatAmount(value) {
  return Number(value || 0);
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
        {
          success: false,
          message: "Maksimal periode laporan adalah 31 hari.",
        },
        { status: 400 }
      );
    }

    const endExclusive = addDays(endDate, 1);

    const transactions = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endExclusive,
        },
      },
      select: {
        id: true,
        bookingCode: true,
        createdAt: true,
        totalPrice: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paidAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        room: {
          select: {
            roomNumber: true,
            roomType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalTransactions = transactions.length;

    const paidTransactions = transactions.filter(
      (item) => item.paymentStatus === "LUNAS"
    );

    const pendingTransactions = transactions.filter(
      (item) => item.paymentStatus === "MENUNGGU_KONFIRMASI"
    );

    const unpaidTransactions = transactions.filter(
      (item) => item.paymentStatus === "BELUM_DIBAYAR"
    );

    const rejectedTransactions = transactions.filter(
      (item) => item.paymentStatus === "DITOLAK"
    );

    const totalRevenue = paidTransactions.reduce(
      (total, item) => total + formatAmount(item.totalPrice),
      0
    );

    const daily = [];

    for (let index = 0; index < dayCount; index += 1) {
      const currentDate = addDays(startDate, index);
      const nextDate = addDays(currentDate, 1);

      const dailyTransactions = transactions.filter(
        (item) =>
          item.createdAt >= currentDate && item.createdAt < nextDate
      );

      const dailyPaid = dailyTransactions.filter(
        (item) => item.paymentStatus === "LUNAS"
      );

      const dailyRevenue = dailyPaid.reduce(
        (total, item) => total + formatAmount(item.totalPrice),
        0
      );

      daily.push({
        date: currentDate.toISOString().slice(0, 10),
        totalTransactions: dailyTransactions.length,
        paidTransactions: dailyPaid.length,
        revenue: dailyRevenue,
      });
    }

    const transactionData = transactions.map((item) => ({
      id: item.id,
      bookingCode: item.bookingCode,
      date: item.createdAt,
      guestName: item.user.name,
      guestEmail: item.user.email,
      roomNumber: item.room.roomNumber,
      roomType: item.room.roomType.name,
      totalPrice: formatAmount(item.totalPrice),
      reservationStatus: item.status,
      paymentStatus: item.paymentStatus,
      paymentMethod: item.paymentMethod,
      paidAt: item.paidAt,
    }));

    return NextResponse.json({
      success: true,
      message: "Laporan transaksi berhasil diambil.",
      data: {
        period: {
          startDate: startValue,
          endDate: endValue,
        },
        summary: {
          totalTransactions,
          paidTransactions: paidTransactions.length,
          pendingTransactions: pendingTransactions.length,
          unpaidTransactions: unpaidTransactions.length,
          rejectedTransactions: rejectedTransactions.length,
          totalRevenue,
        },
        daily,
        transactions: transactionData,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("TRANSACTION_REPORT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengambil laporan transaksi hotel.",
      },
      { status: 500 }
    );
  }
}
