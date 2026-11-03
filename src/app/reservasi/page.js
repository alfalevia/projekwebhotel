
"use client";

import { useEffect, useState } from "react";

function formatRupiah(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function getLocalDateString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ReservasiPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [today, setToday] = useState("");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [form, setForm] = useState({
    roomId: "",
    checkIn: "",
    checkOut: "",
    guests: "1",
  });

  // Mengambil tanggal setelah komponen dimuat di browser
  useEffect(() => {
    setToday(getLocalDateString());
  }, []);

  // Memeriksa pengguna yang sedang login
  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (!response.ok || !result.success || !result.data?.id) {
          if (active) {
            setUser(null);
            setMessage("Silakan masuk ke akun terlebih dahulu untuk melakukan reservasi.");
            setMessageType("error");
          }
          return;
        }

        if (active) {
          setUser(result.data);
        }
      } catch (error) {
        if (active) {
          setUser(null);
          setMessage("Gagal memeriksa sesi login. Silakan coba lagi.");
          setMessageType("error");
        }
      } finally {
        if (active) {
          setLoadingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  // Mengambil data kamar dari database
  useEffect(() => {
    let active = true;

    async function loadRooms() {
      try {
        const response = await fetch("/api/room-types");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Gagal memuat data kamar.");
        }

        const availableRooms = result.data.flatMap((type) =>
          (type.rooms || [])
            .filter((room) => room.status === "TERSEDIA")
            .map((room) => ({
              ...room,
              typeName: type.name,
              price: type.price,
              capacity: type.capacity,
            }))
        );

        if (active) {
          setRooms(availableRooms);
        }
      } catch (error) {
        if (active) {
          setMessage(error.message || "Terjadi kesalahan saat memuat kamar.");
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

  const checkInMin = today || undefined;
  const checkOutMin = form.checkIn || today || undefined;

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value,
      };

      // Jika check-in berubah dan check-out tidak lagi valid,
      // kosongkan check-out agar pengguna memilih ulang.
      if (
        name === "checkIn" &&
        updated.checkOut &&
        updated.checkOut <= value
      ) {
        updated.checkOut = "";
      }

      // Jika kamar berubah, pastikan jumlah tamu tidak melebihi kapasitas.
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

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    if (loadingUser) {
      setMessage("Sedang memeriksa akun. Silakan tunggu sebentar.");
      setMessageType("error");
      return;
    }

    if (!user?.id) {
      setMessage("Silakan masuk ke akun terlebih dahulu untuk melakukan reservasi.");
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
        `Jumlah tamu harus antara 1 sampai ${selectedRoom.capacity} orang untuk kamar ini.`
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
        body: JSON.stringify({
          userId: Number(user.id),
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
        `Reservasi berhasil dibuat! Kode booking: ${result.data.bookingCode}. Total: ${formatRupiah(result.data.totalPrice)}. Status: ${result.data.status}.`
      );
      setMessageType("success");

      setForm({
        roomId: "",
        checkIn: "",
        checkOut: "",
        guests: "1",
      });
    } catch (error) {
      setMessage(
        error.message || "Terjadi kesalahan saat membuat reservasi."
      );
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  }

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

          <a
            href="/login"
            className="mt-7 inline-block bg-[#6B452D] px-7 py-3 font-semibold text-white transition hover:bg-[#4B2E1C]"
          >
            Masuk ke Akun
          </a>

          <p className="mt-5 text-sm text-[#76604D]">
            Belum punya akun?{" "}
            <a href="/register" className="font-semibold underline">
              Daftar di sini
            </a>
          </p>

          <a
            href="/"
            className="mt-6 inline-block text-sm text-[#8B6B50] hover:text-[#4B2E1C]"
          >
            ← Kembali ke Beranda
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3EC] text-[#4B2E1C]">
      <header className="border-b border-[#E9DCCB] bg-[#FFF9F0]">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="text-xl font-bold tracking-[0.16em]">
            NARA HOTEL
          </a>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-[#76604D] sm:inline">
              Halo, {user.name}
            </span>

            <a href="/" className="text-sm hover:text-[#B08050]">
              ← Kembali ke Beranda
            </a>
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
                required
                min={checkInMin}
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
                required
                min={checkOutMin}
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
            disabled={
              submitting ||
              loading ||
              rooms.length === 0 ||
              !today
            }
            className="w-full bg-[#6B452D] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#4B2E1C] disabled:cursor-not-allowed disabled:bg-[#B9A99A]"
          >
            {submitting ? "Memproses Reservasi..." : "Ajukan Reservasi"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-[#8B6B50]">
            Reservasi yang diajukan akan memiliki status MENUNGGU sampai
            dikonfirmasi.
          </p>
        </form>
      </section>

      <footer className="bg-[#352319] px-5 py-6 text-center text-xs text-[#D7C4AF]">
        © 2026 Nara Hotel. All rights reserved.
      </footer>
    </main>
  );
}
