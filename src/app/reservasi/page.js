
"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

function formatRupiah(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);
}

function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTanggal(dateString) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateString));
}

function labelStatus(status) {
  const labels = {
    MENUNGGU: "Menunggu Konfirmasi",
    DIKONFIRMASI: "Dikonfirmasi",
    CHECK_IN: "Sedang Menginap",
    CHECK_OUT: "Selesai Menginap",
    DIBATALKAN: "Dibatalkan",
  };

  return labels[status] || status?.replaceAll("_", " ") || "-";
}

function warnaStatus(status) {
  const styles = {
    MENUNGGU: "bg-amber-100 text-amber-800 border-amber-200",
    DIKONFIRMASI: "bg-green-100 text-green-800 border-green-200",
    CHECK_IN: "bg-blue-100 text-blue-800 border-blue-200",
    CHECK_OUT: "bg-stone-100 text-stone-700 border-stone-200",
    DIBATALKAN: "bg-red-100 text-red-800 border-red-200",
  };

  return styles[status] || "bg-stone-100 text-stone-700 border-stone-200";
}

function labelPembayaran(status) {
  const labels = {
    BELUM_DIBAYAR: "Belum Dibayar",
    MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi Pembayaran",
    LUNAS: "Lunas",
    DITOLAK: "Pembayaran Ditolak",
  };

  return labels[status] || "Belum Dibayar";
}

function warnaPembayaran(status) {
  const styles = {
    BELUM_DIBAYAR: "bg-amber-100 text-amber-800 border-amber-200",
    MENUNGGU_KONFIRMASI: "bg-blue-100 text-blue-800 border-blue-200",
    LUNAS: "bg-green-100 text-green-800 border-green-200",
    DITOLAK: "bg-red-100 text-red-800 border-red-200",
  };

  return styles[status] || "bg-stone-100 text-stone-700 border-stone-200";
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ReservasiPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [reservationError, setReservationError] = useState("");

  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [uploadingProofId, setUploadingProofId] = useState(null);

  const [paymentMethods, setPaymentMethods] = useState({});
  const [proofFiles, setProofFiles] = useState({});
  const [proofPreviews, setProofPreviews] = useState({});

  const [form, setForm] = useState({
    roomId: "",
    checkIn: "",
    checkOut: "",
    guests: "1",
  });

  // Mengambil riwayat reservasi.
  const loadReservations = useCallback(async () => {
    try {
      const response = await fetch("/api/reservations", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil riwayat reservasi."
        );
      }

      setReservationError("");
      setReservations(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setReservationError(
        error.message || "Terjadi kesalahan saat mengambil riwayat reservasi."
      );
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  // Memeriksa sesi akun pengguna.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    async function checkSession() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
          if (active) {
            setUser(null);
          }
          return;
        }

        if (active) {
          setUser(result.data);
          await loadReservations();
        }
      } catch (error) {
        if (active) {
          console.error("Gagal memeriksa sesi akun:", error);
          setUser(null);
        }
      } finally {
        clearTimeout(timeout);

        if (active) {
          setLoadingUser(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [loadReservations]);

  // Mengambil data kamar sekaligus mengisi formulir dari halaman utama.
  useEffect(() => {
    let active = true;

    async function loadRooms() {
      try {
        const response = await fetch("/api/room-types", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal memuat data kamar.");
        }

        const availableRooms = (result.data || []).flatMap((type) =>
          (type.rooms || [])
            .filter((room) => room.status === "TERSEDIA")
            .map((room) => ({
              ...room,
              roomTypeId: type.id,
              typeName: type.name,
              price: type.price,
              capacity: type.capacity,
            }))
        );

        if (!active) return;

        setRooms(availableRooms);

        const params = new URLSearchParams(window.location.search);
        const roomTypeId = Number(params.get("roomTypeId"));

        if (!Number.isInteger(roomTypeId) || roomTypeId <= 0) {
          return;
        }

        const selected = availableRooms.find(
          (room) => room.roomTypeId === roomTypeId
        );

        if (!selected) return;

        const requestedGuests = Number(params.get("guests") || 1);

        const safeGuests = Math.min(
          Math.max(
            Number.isInteger(requestedGuests) ? requestedGuests : 1,
            1
          ),
          selected.capacity
        );

        const requestedCheckIn = params.get("checkIn") || "";
        const requestedCheckOut = params.get("checkOut") || "";

        setForm((previous) => ({
          ...previous,
          roomId: String(selected.id),
          checkIn: requestedCheckIn,
          checkOut:
            requestedCheckOut > requestedCheckIn
              ? requestedCheckOut
              : "",
          guests: String(safeGuests),
        }));
      } catch (error) {
        if (active) {
          setMessage(error.message || "Gagal memuat kamar.");
          setMessageType("error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      active = false;
    };
  }, []);

  const selectedRoom = rooms.find(
    (room) => room.id === Number(form.roomId)
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      if (
        name === "checkIn" &&
        updated.checkOut &&
        updated.checkOut <= value
      ) {
        updated.checkOut = "";
      }

      if (name === "roomId") {
        const room = rooms.find((item) => item.id === Number(value));

        if (room && Number(updated.guests) > room.capacity) {
          updated.guests = String(room.capacity);
        }
      }

      return updated;
    });

    setMessage("");
    setMessageType("");
  }

  // Membuat reservasi.
  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    const today = getLocalDateString();

    if (!user?.id) {
      setMessage("Silakan masuk ke akun terlebih dahulu.");
      setMessageType("error");
      return;
    }

    if (!form.roomId || !form.checkIn || !form.checkOut) {
      setMessage("Mohon lengkapi semua data reservasi.");
      setMessageType("error");
      return;
    }

    if (form.checkIn < today) {
      setMessage("Tanggal check-in tidak boleh sebelum hari ini.");
      setMessageType("error");
      return;
    }

    if (form.checkOut <= form.checkIn) {
      setMessage("Tanggal check-out harus setelah check-in.");
      setMessageType("error");
      return;
    }

    if (!selectedRoom) {
      setMessage("Silakan pilih kamar yang tersedia.");
      setMessageType("error");
      return;
    }

    const guestCount = Number(form.guests);

    if (
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      guestCount > selectedRoom.capacity
    ) {
      setMessage(
        `Jumlah tamu harus antara 1 sampai ${selectedRoom.capacity} orang.`
      );
      setMessageType("error");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          roomId: Number(form.roomId),
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: guestCount,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Reservasi gagal dibuat.");
      }

      setMessage(
        `Reservasi berhasil dibuat! Kode booking: ${result.data.bookingCode}. Total: ${formatRupiah(result.data.totalPrice)}.`
      );
      setMessageType("success");

      setForm({
        roomId: "",
        checkIn: "",
        checkOut: "",
        guests: "1",
      });

      await loadReservations();
    } catch (error) {
      setMessage(error.message || "Gagal membuat reservasi.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

  // Memilih bukti transfer.
  function handleProofChange(reservationId, file) {
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      window.alert("Format file harus JPG, PNG, atau WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      window.alert("Ukuran file maksimal 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setProofFiles((previous) => ({
      ...previous,
      [reservationId]: file,
    }));

    setProofPreviews((previous) => {
      const oldUrl = previous[reservationId];

      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }

      return {
        ...previous,
        [reservationId]: previewUrl,
      };
    });
  }

  // Menghapus pilihan bukti transfer.
  function removeProofFile(reservationId) {
    const previewUrl = proofPreviews[reservationId];

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setProofFiles((previous) => ({
      ...previous,
      [reservationId]: null,
    }));

    setProofPreviews((previous) => ({
      ...previous,
      [reservationId]: null,
    }));
  }

  // Mengunggah bukti transfer.
  async function uploadProof(reservationId, file) {
    const formData = new FormData();
    formData.append("paymentProof", file);

    const response = await fetch(
      `/api/reservations/${reservationId}/proof`,
      {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Gagal mengunggah bukti transfer."
      );
    }

    return result;
  }

  // Mengajukan pembayaran.
  async function handlePayment(reservation) {
    const paymentMethod = paymentMethods[reservation.id];
    const selectedFile = proofFiles[reservation.id];

    if (!paymentMethod) {
      window.alert("Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }

    if (paymentMethod === "TRANSFER_BANK" && !selectedFile) {
      window.alert("Silakan pilih bukti transfer terlebih dahulu.");
      return;
    }

    if (
      paymentMethod === "TRANSFER_BANK" &&
      !ALLOWED_FILE_TYPES.includes(selectedFile.type)
    ) {
      window.alert("Format file harus JPG, PNG, atau WebP.");
      return;
    }

    if (
      paymentMethod === "TRANSFER_BANK" &&
      selectedFile.size > MAX_FILE_SIZE
    ) {
      window.alert("Ukuran file maksimal 5 MB.");
      return;
    }

    const methodLabel =
      paymentMethod === "TRANSFER_BANK" ? "Transfer Bank" : "Tunai";

    const confirmed = window.confirm(
      `Ajukan pembayaran reservasi ${reservation.bookingCode} menggunakan ${methodLabel}?`
    );

    if (!confirmed) return;

    setPayingId(reservation.id);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ paymentMethod }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Pengajuan pembayaran gagal."
        );
      }

      if (paymentMethod === "TRANSFER_BANK" && selectedFile) {
        await uploadProof(reservation.id, selectedFile);
      }

      removeProofFile(reservation.id);
      await loadReservations();

      window.alert(
        "Pembayaran berhasil diajukan dan menunggu konfirmasi petugas."
      );
    } catch (error) {
      console.error("Kesalahan pengajuan pembayaran:", error);

      await loadReservations();

      window.alert(
        error.message || "Gagal mengajukan pembayaran. Silakan coba lagi."
      );
    } finally {
      setPayingId(null);
    }
  }

  // Mengunggah bukti untuk pembayaran yang sudah diajukan.
  async function handleUploadProof(reservationId) {
    const file = proofFiles[reservationId];

    if (!file) {
      window.alert("Pilih bukti transfer terlebih dahulu.");
      return;
    }

    setUploadingProofId(reservationId);

    try {
      const result = await uploadProof(reservationId, file);

      removeProofFile(reservationId);
      await loadReservations();

      window.alert(result.message || "Bukti transfer berhasil diunggah.");
    } catch (error) {
      console.error("Upload proof error:", error);
      window.alert(error.message || "Gagal mengunggah bukti transfer.");
    } finally {
      setUploadingProofId(null);
    }
  }

  // Membatalkan reservasi.
  async function handleCancelReservation(reservationId) {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin membatalkan reservasi ini?"
    );

    if (!confirmed) return;

    setCancellingId(reservationId);

    try {
      const response = await fetch(
        `/api/reservations/${reservationId}/cancel`,
        {
          method: "PATCH",
          credentials: "same-origin",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Reservasi gagal dibatalkan.");
      }

      await loadReservations();

      window.alert(result.message || "Reservasi berhasil dibatalkan.");
    } catch (error) {
      window.alert(error.message || "Gagal membatalkan reservasi.");
    } finally {
      setCancellingId(null);
    }
  }

  // Tampilan saat memeriksa akun.
  if (loadingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F3EC] px-5 text-[#4B2E1C]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[#D8B995] border-t-[#6B452D]" />
          <p className="text-sm">Memeriksa sesi akun...</p>
        </div>
      </main>
    );
  }

  // Tampilan jika belum login.
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F3EC] px-5 text-[#4B2E1C]">
        <section className="w-full max-w-lg border border-[#E5D5C2] bg-[#FFF9F0] p-8 text-center shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#A57A50]">
            NARA HOTEL
          </p>

          <h1 className="text-2xl font-semibold">
            Masuk untuk Melakukan Reservasi
          </h1>

          <p className="mt-4 leading-7 text-[#76604D]">
            Kamu perlu masuk ke akun terlebih dahulu sebelum memesan kamar.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-block bg-[#6B452D] px-7 py-3 font-semibold text-white transition hover:bg-[#4B2E1C]"
          >
            Masuk ke Akun
          </Link>

          <p className="mt-5 text-sm text-[#76604D]">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold underline">
              Daftar di sini
            </Link>
          </p>

          <Link
            href="/"
            className="mt-6 inline-block text-sm text-[#8B6B50] hover:text-[#4B2E1C]"
          >
            ← Kembali ke Beranda
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3EC] text-[#4B2E1C]">
      <header className="border-b border-[#E9DCCB] bg-[#FFF9F0]">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="text-xl font-bold tracking-[0.16em]">
            NARA HOTEL
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[#76604D] sm:inline">
              Halo, {user.name}
            </span>

            <Link href="/" className="text-sm hover:text-[#B08050]">
              ← Kembali ke Beranda
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <div className="mb-8 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#A57A50]">
            Booking Your Stay
          </p>

          <h1 className="text-3xl font-semibold md:text-4xl">
            Formulir Reservasi
          </h1>

          <p className="mt-4 leading-7 text-[#76604D]">
            Lengkapi informasi di bawah ini untuk mengajukan pemesanan kamar
            Nara Hotel.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-[#E5D5C2] bg-[#FFF9F0] p-6 shadow-sm md:p-9"
        >
          {message && (
            <div
              role="status"
              className={`mb-6 border p-4 text-sm leading-6 ${
                messageType === "success"
                  ? "border-[#B7C9A8] bg-[#EDF3E8] text-[#38512F]"
                  : "border-[#D9B4A5] bg-[#F8E9E3] text-[#873F2C]"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mb-6">
            <label
              htmlFor="account"
              className="mb-2 block text-sm font-semibold"
            >
              Nama Pengguna
            </label>

            <input
              id="account"
              type="text"
              readOnly
              value={user.name || user.email || ""}
              className="w-full border border-[#D9C6B1] bg-[#EFE4D6] px-4 py-3 text-[#76604D] outline-none"
            />

            <p className="mt-2 text-xs leading-5 text-[#8B6B50]">
              Reservasi akan tercatat atas akun yang sedang kamu gunakan.
            </p>
          </div>

          <div className="mb-6">
            <label
              htmlFor="roomId"
              className="mb-2 block text-sm font-semibold"
            >
              Pilih Kamar
            </label>

            <select
              id="roomId"
              name="roomId"
              required
              value={form.roomId}
              onChange={handleChange}
              disabled={loading || rooms.length === 0}
              className="w-full border border-[#D9C6B1] bg-white px-4 py-3 outline-none focus:border-[#8B5E3C] disabled:bg-[#EFE4D6]"
            >
              <option value="">
                {loading ? "Memuat kamar..." : "Pilih kamar yang tersedia"}
              </option>

              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.typeName} — Kamar {room.roomNumber} —{" "}
                  {formatRupiah(room.price)} per malam
                </option>
              ))}
            </select>

            {!loading && rooms.length === 0 && (
              <p className="mt-2 text-xs text-[#873F2C]">
                Tidak ada kamar tersedia saat ini.
              </p>
            )}
          </div>

          {selectedRoom && (
            <div className="mb-6 border border-[#E5D5C2] bg-[#F8F3EC] p-4">
              <p className="font-semibold">{selectedRoom.typeName}</p>
              <p className="mt-1 text-sm text-[#76604D]">
                Nomor kamar: {selectedRoom.roomNumber}
              </p>
              <p className="mt-1 text-sm text-[#76604D]">
                Kapasitas: {selectedRoom.capacity} tamu
              </p>
              <p className="mt-2 font-semibold">
                {formatRupiah(selectedRoom.price)} / malam
              </p>
            </div>
          )}

          <div className="mb-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="checkIn"
                className="mb-2 block text-sm font-semibold"
              >
                Tanggal Check-in
              </label>

              <input
                id="checkIn"
                name="checkIn"
                type="date"
                min={getLocalDateString()}
                required
                value={form.checkIn}
                onChange={handleChange}
                className="w-full border border-[#D9C6B1] bg-white px-4 py-3 outline-none focus:border-[#8B5E3C]"
              />
            </div>

            <div>
              <label
                htmlFor="checkOut"
                className="mb-2 block text-sm font-semibold"
              >
                Tanggal Check-out
              </label>

              <input
                id="checkOut"
                name="checkOut"
                type="date"
                min={form.checkIn || getLocalDateString()}
                required
                value={form.checkOut}
                onChange={handleChange}
                className="w-full border border-[#D9C6B1] bg-white px-4 py-3 outline-none focus:border-[#8B5E3C]"
              />
            </div>
          </div>

          <div className="mb-8">
            <label
              htmlFor="guests"
              className="mb-2 block text-sm font-semibold"
            >
              Jumlah Tamu
            </label>

            <input
              id="guests"
              name="guests"
              type="number"
              min="1"
              max={selectedRoom?.capacity || 10}
              required
              value={form.guests}
              onChange={handleChange}
              className="w-full border border-[#D9C6B1] bg-white px-4 py-3 outline-none focus:border-[#8B5E3C]"
            />

            {selectedRoom && (
              <p className="mt-2 text-xs text-[#8B6B50]">
                Maksimal {selectedRoom.capacity} tamu untuk kamar ini.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || loading || rooms.length === 0}
            className="w-full bg-[#6B452D] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#4B2E1C] disabled:cursor-not-allowed disabled:bg-[#B9A99A]"
          >
            {submitting ? "Memproses Reservasi..." : "Ajukan Reservasi"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-[#8B6B50]">
            Reservasi yang diajukan akan memiliki status MENUNGGU sampai
            dikonfirmasi.
          </p>
        </form>

        {/* Riwayat reservasi */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#A57A50]">
              Pemesanan Kamu
            </p>

            <h2 className="text-2xl font-semibold">
              Riwayat Reservasi Saya
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#76604D]">
              Lihat kode booking, jadwal menginap, biaya, status reservasi,
              dan pembayaran kamar kamu.
            </p>
          </div>

          {loadingReservations ? (
            <div className="border border-[#E5D5C2] bg-[#FFF9F0] p-6 text-center text-sm text-[#76604D]">
              Memuat riwayat reservasi...
            </div>
          ) : reservationError ? (
            <div className="border border-[#D9B4A5] bg-[#F8E9E3] p-5 text-sm text-[#873F2C]">
              <p>{reservationError}</p>
              <button
                type="button"
                onClick={loadReservations}
                className="mt-3 font-semibold underline"
              >
                Coba muat ulang
              </button>
            </div>
          ) : reservations.length === 0 ? (
            <div className="border border-[#E5D5C2] bg-[#FFF9F0] p-8 text-center">
              <p className="text-lg font-semibold">
                Belum Ada Riwayat Reservasi
              </p>
              <p className="mt-2 text-sm leading-6 text-[#76604D]">
                Reservasi yang berhasil kamu ajukan akan muncul di bagian ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((reservation) => {
                const paymentStatus =
                  reservation.paymentStatus || "BELUM_DIBAYAR";

                const canPay =
                  reservation.status !== "DIBATALKAN" &&
                  paymentStatus !== "LUNAS" &&
                  paymentStatus !== "MENUNGGU_KONFIRMASI";

                const needsProof =
                  paymentStatus === "MENUNGGU_KONFIRMASI" &&
                  reservation.paymentMethod === "TRANSFER_BANK" &&
                  !reservation.paymentProof;

                const selectedFile = proofFiles[reservation.id];
                const preview = proofPreviews[reservation.id];

                return (
                  <article
                    key={reservation.id}
                    className="border border-[#E5D5C2] bg-[#FFF9F0] p-5 shadow-sm md:p-6"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#A57A50]">
                          Kode Booking
                        </p>
                        <p className="mt-1 break-all font-semibold">
                          {reservation.bookingCode}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit border px-3 py-1 text-xs font-semibold ${warnaStatus(reservation.status)}`}
                      >
                        {labelStatus(reservation.status)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-[#E9DCCB] pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-[#8B6B50]">Tipe Kamar</p>
                        <p className="mt-1 font-medium">
                          {reservation.room?.roomType || "-"}
                        </p>
                        <p className="text-sm text-[#76604D]">
                          Kamar {reservation.room?.roomNumber || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B6B50]">Jumlah Tamu</p>
                        <p className="mt-1 font-medium">
                          {reservation.guests} orang
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B6B50]">Check-in</p>
                        <p className="mt-1 font-medium">
                          {formatTanggal(reservation.checkIn)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B6B50]">Check-out</p>
                        <p className="mt-1 font-medium">
                          {formatTanggal(reservation.checkOut)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-1 border-t border-[#E9DCCB] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[#76604D]">
                        Total biaya menginap
                      </p>
                      <p className="text-lg font-bold text-[#6B452D]">
                        {formatRupiah(reservation.totalPrice)}
                      </p>
                    </div>

                    {/* Informasi pembayaran */}
                    <div className="mt-5 border-t border-[#E9DCCB] pt-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Status Pembayaran
                          </p>

                          <p className="mt-1 text-sm text-[#76604D]">
                            {reservation.paymentMethod === "TRANSFER_BANK"
                              ? "Metode: Transfer Bank"
                              : reservation.paymentMethod === "TUNAI"
                                ? "Metode: Tunai"
                                : "Metode belum dipilih"}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit border px-3 py-1 text-xs font-semibold ${warnaPembayaran(paymentStatus)}`}
                        >
                          {labelPembayaran(paymentStatus)}
                        </span>
                      </div>

                      {/* Pembayaran baru */}
                      {canPay && (
                        <div className="mt-4">
                          <label
                            htmlFor={`payment-${reservation.id}`}
                            className="mb-2 block text-sm font-semibold"
                          >
                            Pilih Metode Pembayaran
                          </label>

                          <select
                            id={`payment-${reservation.id}`}
                            value={paymentMethods[reservation.id] || ""}
                            onChange={(event) => {
                              setPaymentMethods((previous) => ({
                                ...previous,
                                [reservation.id]: event.target.value,
                              }));

                              removeProofFile(reservation.id);
                            }}
                            className="w-full border border-[#D9C6B1] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B5E3C]"
                          >
                            <option value="">
                              Pilih metode pembayaran
                            </option>
                            <option value="TRANSFER_BANK">
                              Transfer Bank
                            </option>
                            <option value="TUNAI">Tunai</option>
                          </select>

                          {paymentMethods[reservation.id] ===
                            "TRANSFER_BANK" && (
                            <div className="mt-4 border border-[#E5D5C2] bg-[#F8F3EC] p-4">
                              <label
                                htmlFor={`new-proof-${reservation.id}`}
                                className="mb-2 block text-sm font-semibold"
                              >
                                Unggah Bukti Transfer
                              </label>

                              <input
                                id={`new-proof-${reservation.id}`}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) =>
                                  handleProofChange(
                                    reservation.id,
                                    event.target.files?.[0]
                                  )
                                }
                                className="block w-full text-sm"
                              />

                              <p className="mt-2 text-xs text-[#8B6B50]">
                                JPG, PNG, atau WebP. Maksimal 5 MB.
                              </p>

                              {preview && (
                                <div className="mt-4">
                                  <Image
                                    src={preview}
                                    alt="Preview bukti transfer"
                                    width={640}
                                    height={480}
                                    unoptimized
                                    className="max-h-64 w-auto border border-[#D9C6B1] object-contain"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeProofFile(reservation.id)
                                    }
                                    className="mt-2 text-sm font-semibold text-red-700 underline"
                                  >
                                    Hapus gambar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePayment(reservation)}
                            disabled={
                              payingId === reservation.id ||
                              (paymentMethods[reservation.id] ===
                                "TRANSFER_BANK" &&
                                !selectedFile)
                            }
                            className="mt-3 w-full bg-[#8B5E3C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6B452D] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {payingId === reservation.id
                              ? "Memproses Pembayaran..."
                              : "Bayar Sekarang"}
                          </button>

                          <p className="mt-2 text-xs leading-5 text-[#8B6B50]">
                            Transfer bank wajib menyertakan bukti pembayaran.
                            Pengajuan akan diperiksa oleh petugas hotel.
                          </p>
                        </div>
                      )}

                      {/* Pembayaran transfer yang belum memiliki bukti */}
                      {needsProof && (
                        <div className="mt-4 border border-[#E5D5C2] bg-[#F8F3EC] p-4">
                          <p className="text-sm font-semibold">
                            Unggah Bukti Transfer
                          </p>

                          <p className="mt-1 text-sm leading-6 text-[#76604D]">
                            Pembayaran sudah diajukan, tetapi bukti transfer
                            belum tersedia. Silakan unggah bukti agar petugas
                            dapat memeriksanya.
                          </p>

                          <input
                            id={`old-proof-${reservation.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                              handleProofChange(
                                reservation.id,
                                event.target.files?.[0]
                              )
                            }
                            className="mt-3 block w-full text-sm"
                          />

                          <p className="mt-2 text-xs text-[#8B6B50]">
                            JPG, PNG, atau WebP. Maksimal 5 MB.
                          </p>

                          {preview && (
                            <div className="mt-4">
                              <Image
                                src={preview}
                                alt="Preview bukti transfer"
                                width={640}
                                height={480}
                                unoptimized
                                className="max-h-64 w-auto border border-[#D9C6B1] object-contain"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeProofFile(reservation.id)
                                }
                                className="mt-2 text-sm font-semibold text-red-700 underline"
                              >
                                Hapus gambar
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleUploadProof(reservation.id)
                            }
                            disabled={
                              !selectedFile ||
                              uploadingProofId === reservation.id
                            }
                            className="mt-4 w-full bg-[#6B452D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4B2E1C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {uploadingProofId === reservation.id
                              ? "Mengunggah..."
                              : "Kirim Bukti Transfer"}
                          </button>
                        </div>
                      )}

                      {/* Bukti yang sudah tersimpan */}
                      {reservation.paymentProof &&
                        reservation.paymentMethod === "TRANSFER_BANK" && (
                          <div className="mt-4 border border-green-200 bg-green-50 p-4">
                            <p className="text-sm font-semibold text-green-800">
                              Bukti pembayaran sudah diunggah.
                            </p>

                            <a
                              href={reservation.paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm font-semibold text-[#6B452D] underline"
                            >
                              Lihat Bukti Pembayaran
                            </a>
                          </div>
                        )}

                      {paymentStatus === "MENUNGGU_KONFIRMASI" && (
                        <p className="mt-3 text-sm leading-6 text-blue-800">
                          Pengajuan pembayaran sedang menunggu pemeriksaan
                          dan konfirmasi petugas hotel.
                        </p>
                      )}

                      {paymentStatus === "LUNAS" && (
                        <p className="mt-3 text-sm font-medium text-green-800">
                          Pembayaran telah dikonfirmasi dan dinyatakan lunas.
                        </p>
                      )}

                      {paymentStatus === "DITOLAK" && (
                        <p className="mt-3 text-sm font-medium text-red-800">
                          Pembayaran ditolak. Silakan ajukan pembayaran
                          kembali atau hubungi petugas hotel.
                        </p>
                      )}
                    </div>

                    {/* Pembatalan reservasi */}
                    {(reservation.status === "MENUNGGU" ||
                      reservation.status === "DIKONFIRMASI") && (
                      <div className="mt-5 border-t border-[#E9DCCB] pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleCancelReservation(reservation.id)
                          }
                          disabled={
                            cancellingId === reservation.id ||
                            payingId === reservation.id ||
                            uploadingProofId === reservation.id
                          }
                          className="border border-red-300 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {cancellingId === reservation.id
                            ? "Membatalkan..."
                            : "Batalkan Reservasi"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <footer className="bg-[#352319] px-5 py-6 text-center text-xs text-[#D7C4AF]">
        © 2026 Nara Hotel. All rights reserved.
      </footer>
    </main>
  );
}
