
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// Membaca respons API.
async function readResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Respons server bukan JSON (HTTP ${response.status}). Periksa API dan Terminal VS Code.`
    );
  }
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function tanggal(value) {
  return value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "-";
}

function statusStyle(status) {
  switch (status) {
    case "DIKONFIRMASI":
      return "bg-green-100 text-green-800";
    case "MENUNGGU":
      return "bg-amber-100 text-amber-800";
    case "CHECK_IN":
      return "bg-blue-100 text-blue-800";
    case "CHECK_OUT":
      return "bg-gray-200 text-gray-700";
    case "DIBATALKAN":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function paymentStatusStyle(status) {
  switch (status) {
    case "LUNAS":
      return "bg-green-100 text-green-800";
    case "MENUNGGU_KONFIRMASI":
      return "bg-amber-100 text-amber-800";
    case "DITOLAK":
      return "bg-red-100 text-red-800";
    case "BELUM_DIBAYAR":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function paymentStatusLabel(status) {
  switch (status) {
    case "LUNAS":
      return "LUNAS";
    case "MENUNGGU_KONFIRMASI":
      return "MENUNGGU KONFIRMASI";
    case "DITOLAK":
      return "DITOLAK";
    case "BELUM_DIBAYAR":
      return "BELUM DIBAYAR";
    default:
      return "BELUM DIBAYAR";
  }
}

export default function ResepsionisPage() {
  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");

  const [confirmingId, setConfirmingId] = useState(null);
  const [allocatingId, setAllocatingId] = useState(null);
  const [checkingInId, setCheckingInId] = useState(null);
  const [checkingOutId, setCheckingOutId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const [selectedRooms, setSelectedRooms] = useState({});

  // Mengambil data reservasi.
  const loadReservations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/resepsionis/reservations", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Gagal memuat reservasi (HTTP ${response.status}).`
        );
      }

      const data = Array.isArray(result.data) ? result.data : [];

      setReservations(data);

      setSelectedRooms((previous) => {
        const updated = { ...previous };

        data.forEach((item) => {
          if (item.room?.id && updated[item.id] === undefined) {
            updated[item.id] = String(item.room.id);
          }
        });

        return updated;
      });
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat reservasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Mengambil data kamar.
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);

    try {
      const response = await fetch("/api/resepsionis/rooms", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Gagal memuat daftar kamar (HTTP ${response.status}).`
        );
      }

      setRooms(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Gagal memuat daftar kamar.");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  // Mengambil pembayaran yang menunggu konfirmasi.
  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);

    try {
      const response = await fetch("/api/resepsionis/payments", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Gagal memuat pembayaran (HTTP ${response.status}).`
        );
      }

      setPayments(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || "Gagal memuat daftar pembayaran.");
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Memuat data awal.
  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        loadReservations();
        loadRooms();
        loadPayments();
      }
    });

    return () => {
      active = false;
    };
  }, [loadReservations, loadRooms, loadPayments]);

  // Memperbarui semua data.
  async function refreshAll() {
    await Promise.all([
      loadReservations(),
      loadRooms(),
      loadPayments(),
    ]);
  }

  // Konfirmasi reservasi.
  async function confirmReservation(item) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin mengonfirmasi reservasi ${item.bookingCode}?`
    );

    if (!yakin) return;

    setConfirmingId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/resepsionis/reservations/${item.id}/confirm`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Konfirmasi gagal (HTTP ${response.status}).`
        );
      }

      window.alert(result.message || "Reservasi berhasil dikonfirmasi.");
      await loadReservations();
    } catch (err) {
      window.alert(
        err.message || "Terjadi kesalahan saat mengonfirmasi reservasi."
      );
    } finally {
      setConfirmingId(null);
    }
  }

  // Verifikasi pembayaran.
  async function verifyPayment(item, action) {
    const menerima = action === "TERIMA";

    if (
      menerima &&
      item.paymentMethod === "TRANSFER_BANK" &&
      !item.paymentProof
    ) {
      window.alert(
        "Bukti transfer belum tersedia. Periksa bukti pembayaran terlebih dahulu."
      );
      return;
    }

    const yakin = window.confirm(
      menerima
        ? `Terima pembayaran reservasi ${item.bookingCode} sebesar ${rupiah(item.totalPrice)}?`
        : `Tolak pembayaran reservasi ${item.bookingCode}?`
    );

    if (!yakin) return;

    setVerifyingId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/resepsionis/payments/${item.id}/verify`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Verifikasi pembayaran gagal (HTTP ${response.status}).`
        );
      }

      window.alert(
        menerima
          ? "Pembayaran berhasil diterima. Status pembayaran menjadi LUNAS."
          : "Pembayaran berhasil ditolak."
      );

      await Promise.all([loadPayments(), loadReservations()]);
    } catch (err) {
      window.alert(
        err.message || "Terjadi kesalahan saat memverifikasi pembayaran."
      );
    } finally {
      setVerifyingId(null);
    }
  }

  // Proses check-in.
  async function checkInReservation(item) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin memproses Check-in reservasi ${item.bookingCode}?`
    );

    if (!yakin) return;

    setCheckingInId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/resepsionis/reservations/${item.id}/check-in`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Check-in gagal (HTTP ${response.status}).`
        );
      }

      window.alert(result.message || "Check-in berhasil.");
      await Promise.all([loadReservations(), loadRooms()]);
    } catch (err) {
      window.alert(err.message || "Terjadi kesalahan saat Check-in.");
    } finally {
      setCheckingInId(null);
    }
  }

  // Proses check-out.
  async function checkOutReservation(item) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin memproses Check-out reservasi ${item.bookingCode}?`
    );

    if (!yakin) return;

    setCheckingOutId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/resepsionis/reservations/${item.id}/check-out`,
        {
          method: "PATCH",
          headers: { Accept: "application/json" },
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Check-out gagal (HTTP ${response.status}).`
        );
      }

      window.alert(result.message || "Check-out berhasil.");
      await Promise.all([loadReservations(), loadRooms()]);
    } catch (err) {
      window.alert(err.message || "Terjadi kesalahan saat Check-out.");
    } finally {
      setCheckingOutId(null);
    }
  }

  // Alokasi kamar.
  async function allocateRoom(item) {
    const roomId = Number(selectedRooms[item.id]);

    if (!roomId) {
      window.alert("Silakan pilih kamar terlebih dahulu.");
      return;
    }

    const selectedRoom = rooms.find((room) => room.id === roomId);

    if (!selectedRoom) {
      window.alert("Kamar yang dipilih tidak ditemukan. Perbarui data kamar.");
      return;
    }

    const yakin = window.confirm(
      `Alokasikan kamar ${selectedRoom.roomNumber} untuk reservasi ${item.bookingCode}?`
    );

    if (!yakin) return;

    setAllocatingId(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/resepsionis/reservations/${item.id}/allocate`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        }
      );

      const result = await readResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            `Alokasi kamar gagal (HTTP ${response.status}).`
        );
      }

      window.alert(
        result.message ||
          `Kamar ${selectedRoom.roomNumber} berhasil dialokasikan.`
      );

      await Promise.all([loadReservations(), loadRooms()]);
    } catch (err) {
      window.alert(
        err.message || "Terjadi kesalahan saat mengalokasikan kamar."
      );
    } finally {
      setAllocatingId(null);
    }
  }

  // Pencarian reservasi.
  const filtered = reservations.filter((item) => {
    const search = keyword.toLowerCase();

    return (
      (item.bookingCode || "").toLowerCase().includes(search) ||
      (item.guest?.name || "").toLowerCase().includes(search) ||
      String(item.room?.roomNumber || "").toLowerCase().includes(search)
    );
  });

  const totalLunas = reservations.filter(
    (item) => item.paymentStatus === "LUNAS"
  ).length;

  const totalMenungguPembayaran = reservations.filter(
    (item) => item.paymentStatus === "MENUNGGU_KONFIRMASI"
  ).length;

  return (
    <main className="min-h-screen bg-[#FAF5EC] text-[#49372B]">
      <header className="border-b border-[#E7D9C8] bg-[#FFFDF9]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-semibold tracking-widest">
            NARA HOTEL
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#D9C4AD] px-4 py-2 text-sm hover:bg-[#F0E4D5]"
          >
            Halaman utama
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#A47750]">
          Front Office Management
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">
              Dashboard Resepsionis
            </h1>
            <p className="mt-2 text-sm text-[#806B59]">
              Kelola reservasi, pembayaran, alokasi kamar, Check-in, dan
              Check-out tamu.
            </p>
          </div>

          <button
            onClick={refreshAll}
            disabled={loading || roomsLoading || paymentsLoading}
            className="rounded-full bg-[#79563B] px-5 py-3 text-sm text-white hover:bg-[#60432E] disabled:opacity-50"
          >
            {loading || roomsLoading || paymentsLoading
              ? "Memuat..."
              : "Perbarui data"}
          </button>
        </div>

        {/* Statistik */}
        <div className="my-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Total Reservasi", reservations.length],
            [
              "Menunggu Reservasi",
              reservations.filter((r) => r.status === "MENUNGGU").length,
            ],
            [
              "Dikonfirmasi",
              reservations.filter((r) => r.status === "DIKONFIRMASI").length,
            ],
            [
              "Sedang Menginap",
              reservations.filter((r) => r.status === "CHECK_IN").length,
            ],
            ["Pembayaran Lunas", totalLunas],
            ["Menunggu Pembayaran", totalMenungguPembayaran],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E7D9C8] bg-[#FFFDF9] p-5 shadow-sm"
            >
              <p className="text-sm text-[#806B59]">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* VERIFIKASI PEMBAYARAN */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-[#E7D9C8] bg-[#FFFDF9] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7D9C8] p-5">
            <div>
              <h2 className="text-xl font-semibold">
                Verifikasi Pembayaran
              </h2>
              <p className="mt-1 text-sm text-[#806B59]">
                Periksa pengajuan pembayaran tamu sebelum menerima atau
                menolaknya.
              </p>
            </div>

            <button
              onClick={loadPayments}
              disabled={paymentsLoading}
              className="rounded-full border border-[#D9C4AD] px-4 py-2 text-sm hover:bg-[#F0E4D5] disabled:opacity-50"
            >
              {paymentsLoading ? "Memuat..." : "Perbarui pembayaran"}
            </button>
          </div>

          <div className="border-b border-[#E7D9C8] bg-[#F5EBDD] px-5 py-3">
            <p className="text-sm font-medium text-[#79563B]">
              Pembayaran menunggu konfirmasi: {payments.length}
            </p>
          </div>

          {paymentsLoading ? (
            <p className="p-8 text-center text-sm text-[#806B59]">
              Memuat daftar pembayaran...
            </p>
          ) : payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#806B59]">
              Belum ada pembayaran yang menunggu konfirmasi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#FCF6EE] text-[#71563F]">
                  <tr>
                    <th className="px-5 py-4">Kode Booking</th>
                    <th className="px-5 py-4">Nama Tamu</th>
                    <th className="px-5 py-4">Kamar</th>
                    <th className="px-5 py-4">Metode</th>
                    <th className="px-5 py-4">Total Pembayaran</th>
                    <th className="px-5 py-4">Bukti Pembayaran</th>
                    <th className="px-5 py-4">Tindakan</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EFE3D5]">
                  {payments.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FCF6EE]">
                      <td className="px-5 py-4 font-semibold">
                        {item.bookingCode}
                      </td>

                      <td className="px-5 py-4">
                        {item.guest?.name || "-"}
                        <p className="mt-1 text-xs text-[#806B59]">
                          {item.guest?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {item.room?.roomType || "-"}
                        <p className="mt-1 text-xs text-[#806B59]">
                          Nomor {item.room?.roomNumber || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {item.paymentMethod === "TRANSFER_BANK"
                          ? "Transfer Bank"
                          : item.paymentMethod === "TUNAI"
                            ? "Tunai"
                            : "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-[#79563B]">
                        {rupiah(item.totalPrice)}
                      </td>

                      <td className="px-5 py-4">
                        {item.paymentProof ? (
                          <a
                            href={item.paymentProof}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#A47750] underline"
                          >
                            Lihat bukti
                          </a>
                        ) : (
                          <span className="text-xs text-[#806B59]">
                            Belum tersedia
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => verifyPayment(item, "TERIMA")}
                            disabled={
                              verifyingId === item.id ||
                              (item.paymentMethod === "TRANSFER_BANK" &&
                                !item.paymentProof)
                            }
                            className="rounded-full bg-green-700 px-4 py-2 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-50"
                          >
                            {verifyingId === item.id
                              ? "Memproses..."
                              : "Terima Pembayaran"}
                          </button>

                          <button
                            onClick={() => verifyPayment(item, "TOLAK")}
                            disabled={verifyingId === item.id}
                            className="rounded-full bg-red-700 px-4 py-2 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
                          >
                            Tolak Pembayaran
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DAFTAR RESERVASI */}
        <section className="overflow-hidden rounded-2xl border border-[#E7D9C8] bg-[#FFFDF9] shadow-sm">
          <div className="border-b border-[#E7D9C8] p-5">
            <h2 className="text-xl font-semibold">Daftar Reservasi</h2>
            <p className="mt-1 text-sm text-[#806B59]">
              Konfirmasi reservasi, pilih kamar, serta proses Check-in dan
              Check-out tamu.
            </p>

            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Cari kode booking, nama tamu, nomor kamar..."
              className="mt-4 w-full rounded-xl border border-[#D9C4AD] bg-white px-4 py-3 text-sm outline-none focus:border-[#A47750]"
            />
          </div>

          {loading ? (
            <p className="p-10 text-center text-[#806B59]">
              Memuat data reservasi...
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-[#806B59]">
              Belum ada reservasi yang cocok.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead className="bg-[#F5EBDD] text-[#71563F]">
                  <tr>
                    <th className="px-5 py-4">Kode Booking</th>
                    <th className="px-5 py-4">Nama Tamu</th>
                    <th className="px-5 py-4">Kamar Saat Ini</th>
                    <th className="px-5 py-4">Check-in</th>
                    <th className="px-5 py-4">Check-out</th>
                    <th className="px-5 py-4">Jumlah Tamu</th>
                    <th className="px-5 py-4">Total Biaya</th>
                    <th className="px-5 py-4">Status Reservasi</th>
                    <th className="px-5 py-4">Status Pembayaran</th>
                    <th className="px-5 py-4">Alokasi Kamar</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EFE3D5]">
                  {filtered.map((item) => {
                    const canAllocate = [
                      "MENUNGGU",
                      "DIKONFIRMASI",
                    ].includes(item.status);

                    const availableRooms = rooms.filter(
                      (room) =>
                        room.status === "TERSEDIA" ||
                        room.id === item.room?.id
                    );

                    return (
                      <tr key={item.id} className="hover:bg-[#FCF6EE]">
                        <td className="px-5 py-4 font-semibold">
                          {item.bookingCode}
                        </td>

                        <td className="px-5 py-4">
                          {item.guest?.name || "-"}
                          <p className="mt-1 text-xs text-[#806B59]">
                            {item.guest?.email || ""}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {item.room?.roomType || "-"}
                          <p className="mt-1 text-xs text-[#806B59]">
                            Nomor {item.room?.roomNumber || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {tanggal(item.checkIn)}
                        </td>

                        <td className="px-5 py-4">
                          {tanggal(item.checkOut)}
                        </td>

                        <td className="px-5 py-4">{item.guests} orang</td>

                        <td className="px-5 py-4">
                          {rupiah(item.totalPrice)}
                        </td>

                        {/* STATUS RESERVASI */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1.5 text-xs font-medium ${statusStyle(item.status)}`}
                          >
                            {item.status}
                          </span>

                          {item.status === "MENUNGGU" && (
                            <button
                              onClick={() => confirmReservation(item)}
                              disabled={confirmingId === item.id}
                              className="mt-2 block rounded-full bg-[#79563B] px-3 py-2 text-xs font-medium text-white hover:bg-[#60432E] disabled:opacity-50"
                            >
                              {confirmingId === item.id
                                ? "Memproses..."
                                : "Konfirmasi"}
                            </button>
                          )}

                          {item.status === "DIKONFIRMASI" && (
                            <button
                              onClick={() => checkInReservation(item)}
                              disabled={checkingInId === item.id}
                              className="mt-2 block rounded-full bg-[#A47750] px-3 py-2 text-xs font-medium text-white hover:bg-[#79563B] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {checkingInId === item.id
                                ? "Memproses..."
                                : "Check-in"}
                            </button>
                          )}

                          {item.status === "CHECK_IN" && (
                            <>
                              <p className="mt-2 text-xs text-blue-700">
                                Tamu sedang menginap
                              </p>

                              <button
                                onClick={() => checkOutReservation(item)}
                                disabled={checkingOutId === item.id}
                                className="mt-2 block rounded-full bg-[#79563B] px-3 py-2 text-xs font-medium text-white hover:bg-[#60432E] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {checkingOutId === item.id
                                  ? "Memproses..."
                                  : "Check-out"}
                              </button>
                            </>
                          )}

                          {item.status === "CHECK_OUT" && (
                            <p className="mt-2 text-xs text-[#806B59]">
                              Masa menginap selesai
                            </p>
                          )}
                        </td>

                        {/* STATUS PEMBAYARAN */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-3 py-1.5 text-xs font-medium ${paymentStatusStyle(item.paymentStatus)}`}
                          >
                            {paymentStatusLabel(item.paymentStatus)}
                          </span>

                          {item.paymentMethod && (
                            <p className="mt-2 text-xs text-[#806B59]">
                              {item.paymentMethod === "TRANSFER_BANK"
                                ? "Transfer Bank"
                                : item.paymentMethod === "TUNAI"
                                  ? "Tunai"
                                  : item.paymentMethod}
                            </p>
                          )}
                        </td>

                        {/* ALOKASI KAMAR */}
                        <td className="px-5 py-4">
                          {canAllocate ? (
                            <div className="flex min-w-[190px] flex-col gap-2">
                              <select
                                value={selectedRooms[item.id] || ""}
                                onChange={(event) =>
                                  setSelectedRooms((previous) => ({
                                    ...previous,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                disabled={
                                  roomsLoading || allocatingId === item.id
                                }
                                className="w-full rounded-lg border border-[#D9C4AD] bg-white px-3 py-2 text-xs outline-none focus:border-[#A47750] disabled:opacity-50"
                              >
                                <option value="">Pilih kamar</option>

                                {availableRooms.map((room) => (
                                  <option
                                    key={room.id}
                                    value={String(room.id)}
                                  >
                                    {room.roomNumber} · {room.roomType} ·{" "}
                                    {rupiah(room.price)}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => allocateRoom(item)}
                                disabled={
                                  roomsLoading ||
                                  allocatingId === item.id ||
                                  !selectedRooms[item.id]
                                }
                                className="rounded-full bg-[#A47750] px-3 py-2 text-xs font-medium text-white hover:bg-[#79563B] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {allocatingId === item.id
                                  ? "Mengalokasikan..."
                                  : "Alokasikan Kamar"}
                              </button>

                              {availableRooms.length === 0 && (
                                <p className="text-xs text-red-700">
                                  Tidak ada kamar tersedia.
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#806B59]">
                              Tidak dapat dialokasikan pada status ini.
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#E7D9C8] px-5 py-4 text-xs text-[#806B59]">
            Total data: {filtered.length} reservasi
          </div>
        </section>

        {/* DAFTAR KAMAR */}
        <section className="mt-8 rounded-2xl border border-[#E7D9C8] bg-[#FFFDF9] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Daftar Kamar Hotel</h2>
              <p className="mt-1 text-sm text-[#806B59]">
                Informasi tipe, kapasitas, tarif, dan status kamar.
              </p>
            </div>

            <button
              onClick={loadRooms}
              disabled={roomsLoading}
              className="rounded-full border border-[#D9C4AD] px-4 py-2 text-sm hover:bg-[#F0E4D5] disabled:opacity-50"
            >
              {roomsLoading ? "Memuat..." : "Perbarui kamar"}
            </button>
          </div>

          {roomsLoading ? (
            <p className="py-6 text-sm text-[#806B59]">
              Memuat daftar kamar...
            </p>
          ) : rooms.length === 0 ? (
            <p className="py-6 text-sm text-[#806B59]">
              Data kamar belum tersedia.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl border border-[#E7D9C8] bg-[#FCF6EE] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#806B59]">
                        Lantai {room.floor}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        Kamar {room.roomNumber}
                      </h3>
                      <p className="text-sm text-[#806B59]">
                        {room.roomType}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        room.status === "TERSEDIA"
                          ? "bg-green-100 text-green-800"
                          : room.status === "TERISI"
                            ? "bg-blue-100 text-blue-800"
                            : room.status === "DIBERSIHKAN"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-[#E7D9C8] pt-3">
                    <p className="text-sm">
                      Kapasitas: {room.capacity} orang
                    </p>
                    <p className="mt-1 font-semibold text-[#79563B]">
                      {rupiah(room.price)} / malam
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-[#A18B76]">
          NARA HOTEL · Sistem Informasi Reservasi Hotel
        </p>
      </section>
    </main>
  );
}
