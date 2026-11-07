"use client";

import { useCallback, useEffect, useState } from "react";

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/housekeeping/rooms", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil daftar kamar."
        );
      }

      setRooms(result.data || []);
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan saat mengambil data kamar."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    Promise.resolve().then(() => {
      if (isActive) {
        loadRooms();
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadRooms]);

  async function completeCleaning(room) {
    const confirmed = window.confirm(
      `Tandai kamar ${room.roomNumber} sudah selesai dibersihkan?`
    );

    if (!confirmed) return;

    setProcessingId(room.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/housekeeping/rooms/${room.id}/complete`,
        {
          method: "PATCH",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal memperbarui status kamar."
        );
      }

      setMessage(
        result.message || "Status kamar berhasil diperbarui."
      );

      await loadRooms();
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan saat memperbarui kamar."
      );
    } finally {
      setProcessingId(null);
    }
  }

  const cleaningRooms = rooms.filter(
    (room) => room.status === "DIBERSIHKAN"
  );

  const availableRooms = rooms.filter(
    (room) => room.status === "TERSEDIA"
  );

  function statusLabel(status) {
    const labels = {
      TERSEDIA: "Tersedia",
      TERISI: "Terisi",
      DIBERSIHKAN: "Perlu Dibersihkan",
      PERBAIKAN: "Perbaikan",
    };

    return labels[status] || status;
  }

  function statusColor(status) {
    const colors = {
      TERSEDIA: "bg-green-100 text-green-800",
      TERISI: "bg-orange-100 text-orange-800",
      DIBERSIHKAN: "bg-yellow-100 text-yellow-800",
      PERBAIKAN: "bg-red-100 text-red-800",
    };

    return colors[status] || "bg-gray-100 text-gray-700";
  }

  return (
    <main className="min-h-screen bg-[#FAF5EC] text-[#3D3028]">
      <header className="border-b border-[#E7D9C7] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <div>
            <p className="text-sm font-medium tracking-[0.2em] text-[#987451]">
              NARA HOTEL
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Housekeeping
            </h1>
          </div>

          <button
            type="button"
            onClick={loadRooms}
            disabled={loading}
            className="rounded-xl border border-[#D8C3AA] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[#F5E9D9] disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Muat Ulang"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="mb-7 rounded-2xl bg-[#6F4E37] p-6 text-white shadow-sm md:p-8">
          <p className="text-sm text-[#F0DDC7]">
            Panel Petugas
          </p>

          <h2 className="mt-2 text-2xl font-bold md:text-3xl">
            Kebersihan Kamar Hotel
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F5E9D9]">
            Periksa kamar yang perlu dibersihkan dan perbarui status
            kamar setelah proses pembersihan selesai.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E7D9C7] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#8B7968]">
              Total Kamar
            </p>

            <p className="mt-2 text-3xl font-bold">
              {rooms.length}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-sm text-yellow-800">
              Perlu Dibersihkan
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-900">
              {cleaningRooms.length}
            </p>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm text-green-800">
              Kamar Tersedia
            </p>

            <p className="mt-2 text-3xl font-bold text-green-900">
              {availableRooms.length}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-bold">
            Daftar Kamar
          </h2>

          <p className="mt-1 text-sm text-[#8B7968]">
            Status kamar diperbarui berdasarkan data sistem reservasi.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#E7D9C7] bg-white p-8 text-center text-[#8B7968]">
            Sedang memuat daftar kamar...
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-[#E7D9C7] bg-white p-8 text-center text-[#8B7968]">
            Belum ada data kamar.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E7D9C7] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-[#F1E5D5] text-[#5B4030]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      No. Kamar
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Tipe Kamar
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Tindakan
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0E6DA]">
                  {rooms.map((room) => (
                    <tr
                      key={room.id}
                      className="hover:bg-[#FFFCF7]"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {room.roomNumber}
                      </td>

                      <td className="px-5 py-4">
                        {room.roomType?.name || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                            room.status
                          )}`}
                        >
                          {statusLabel(room.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {room.status === "DIBERSIHKAN" ? (
                          <button
                            type="button"
                            onClick={() => completeCleaning(room)}
                            disabled={processingId === room.id}
                            className="rounded-lg bg-[#6F4E37] px-4 py-2 font-semibold text-white transition hover:bg-[#513824] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {processingId === room.id
                              ? "Memproses..."
                              : "Selesai Dibersihkan"}
                          </button>
                        ) : room.status === "TERSEDIA" ? (
                          <span className="text-xs font-medium text-green-700">
                            Siap digunakan
                          </span>
                        ) : (
                          <span className="text-xs text-[#8B7968]">
                            Tidak ada tindakan
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}