"use client";

import { useEffect, useState } from "react";

const roomImages = {
  "Standard Room":
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  "Deluxe Room":
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
  "Suite Room":
    "https://images.unsplash.com/photo-1611892440504-0a1b1c5c9c9a?auto=format&fit=crop&w=1000&q=85",
};

const facilities = [
  "Kamar Nyaman",
  "Restoran",
  "Kolam Renang",
  "WiFi Gratis",
  "Spa & Wellness",
];

function formatRupiah(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price || 0));
}

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");

  const [today, setToday] = useState("");

 // Mengambil tanggal setelah komponen tampil di browser.
useEffect(() => {
  let active = true;

  Promise.resolve().then(() => {
    if (active) {
      setToday(new Date().toISOString().split("T")[0]);
    }
  });

  return () => {
    active = false;
  };
}, []);
  // Mengambil data tipe kamar dari database.
  useEffect(() => {
    let active = true;

    async function fetchRooms() {
      try {
        setLoadingRooms(true);
        setRoomError("");

        const response = await fetch("/api/room-types");

        if (!response.ok) {
          throw new Error("Gagal mengambil data kamar dari server.");
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Format data kamar tidak sesuai.");
        }

        if (active) {
          setRooms(result.data);
        }
      } catch (error) {
        if (active) {
          setRoomError(
            error.message || "Terjadi kesalahan saat mengambil data kamar."
          );
        }
      } finally {
        if (active) {
          setLoadingRooms(false);
        }
      }
    }

    fetchRooms();

    return () => {
      active = false;
    };
  }, []);

  // Memeriksa sesi login pengguna.
  useEffect(() => {
    let active = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/me");
        const result = await response.json();

        if (active && response.ok && result.success) {
          setUser(result.data);
        } else if (active) {
          setUser(null);
        }
      } catch (error) {
        console.error("Gagal memeriksa sesi login:", error);

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoadingUser(false);
        }
      }
    }

    fetchUser();

    return () => {
      active = false;
    };
  }, []);

  // Keluar dari akun.
  async function handleLogout() {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin keluar dari akun?"
    );

    if (!confirmed) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Gagal keluar dari akun.");
        return;
      }

      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Terjadi kesalahan saat keluar. Silakan coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  }

  // Form pencarian mengarahkan pengunjung ke bagian pilihan kamar.
  function handleSearch(event) {
    event.preventDefault();

    if (!checkIn || !checkOut) {
      alert("Silakan pilih tanggal check-in dan check-out.");
      return;
    }

    if (checkOut <= checkIn) {
      alert("Tanggal check-out harus setelah tanggal check-in.");
      return;
    }

    document.getElementById("kamar")?.scrollIntoView({
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7E9D8] text-[#4B3020]">
      {/* HERO DAN NAVBAR */}
      <section
        id="beranda"
        className="relative min-h-[610px] bg-cover bg-center md:min-h-[690px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(48,29,17,0.76), rgba(48,29,17,0.35), rgba(48,29,17,0.12)), url('https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=2200&q=90')",
        }}
      >
        {/* NAVBAR */}
        <header className="absolute inset-x-0 top-0 z-30 border-b border-white/20 bg-[#3D281C]/15 text-white backdrop-blur-[3px]">
          <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
            <a href="#beranda" className="flex shrink-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#F5DDBE] font-serif text-2xl text-[#FFF5E8]">
                N
              </div>

              <div>
                <h1 className="font-serif text-lg tracking-[0.1em] md:text-xl">
                  NARA HOTEL
                </h1>
                <p className="text-[9px] tracking-wide text-[#F5DEC4]">
                  Stay Better, Feel at Home
                </p>
              </div>
            </a>

            <div className="hidden items-center gap-7 text-sm md:flex">
              <a href="#beranda" className="hover:text-[#E9C69D]">
                Beranda
              </a>
              <a href="#tentang" className="hover:text-[#E9C69D]">
                Tentang Kami
              </a>
              <a href="#kamar" className="hover:text-[#E9C69D]">
                Kamar
              </a>
              <a href="#fasilitas" className="hover:text-[#E9C69D]">
                Fasilitas
              </a>
              <a href="#kontak" className="hover:text-[#E9C69D]">
                Kontak
              </a>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {loadingUser ? (
                <span className="text-xs text-white">Memuat...</span>
              ) : user ? (
                <>
                  <span className="hidden text-sm text-white sm:inline">
                    Halo, {user.name}
                  </span>

                  <a
                    href="/reservasi"
                    className="rounded-full border border-[#E9C69D] bg-[#6B452D]/80 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4B3020]"
                  >
                    Reservasi
                  </a>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="rounded-full border border-white/50 px-4 py-2.5 text-xs text-white hover:bg-white/15 disabled:opacity-50"
                  >
                    {loggingOut ? "Keluar..." : "Keluar"}
                  </button>
                </>
              ) : (
                <a
                  href="/login"
                  className="rounded-full border border-[#E9C69D] bg-[#57371F]/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-[#3D281C]"
                >
                  Masuk
                </a>
              )}
            </div>
          </nav>
        </header>

        {/* HERO TEXT */}
        <div className="relative z-10 mx-auto flex min-h-[610px] max-w-7xl items-center px-6 pb-24 pt-28 md:min-h-[690px] md:px-10">
          <div className="max-w-2xl text-[#FFF8EE]">
            <div className="mb-5 flex items-center gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#F0D0A9]">
                Welcome to NARA HOTEL
              </p>
              <span className="h-px w-16 bg-[#E8C69C]" />
            </div>

            <h2 className="font-serif text-4xl font-medium leading-[1.13] md:text-6xl">
              Temukan Kenyamanan untuk Setiap Perjalanan
            </h2>

            <p className="mt-5 max-w-lg font-serif text-sm leading-7 text-[#F7EBDD] md:text-base">
              Nikmati pengalaman menginap yang berkesan dengan pelayanan
              terbaik dan fasilitas lengkap di NARA HOTEL.
            </p>

            <a
              href="#kamar"
              className="mt-7 inline-flex items-center rounded-full bg-[#F5D7B3] px-7 py-3.5 font-serif text-sm font-semibold text-[#50331F] shadow-lg hover:-translate-y-1 hover:bg-[#FFE7CC]"
            >
              Jelajahi Hotel
            </a>
          </div>
        </div>

        {/* FORM PENCARIAN */}
        <div className="absolute inset-x-0 bottom-[-42px] z-20 px-5">
          <form
            onSubmit={handleSearch}
            className="mx-auto grid max-w-4xl gap-3 rounded-2xl border border-[#E7C9A8] bg-[#FFF3E4] p-4 shadow-[0_12px_35px_rgba(48,29,17,0.22)] md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-center md:gap-0 md:p-3"
          >
            <label className="flex items-center gap-3 border-b border-[#E7C9A8] px-3 py-2 md:border-b-0 md:border-r">
              <span className="min-w-0">
                <span className="block font-serif text-xs font-semibold text-[#57371F]">
                  Check-in Date
                </span>
                <input
                  type="date"
                  value={checkIn}
                  min={today || undefined}
                  onChange={(event) => setCheckIn(event.target.value)}
                  className="mt-1 w-full bg-transparent text-xs text-[#795D43] outline-none"
                  aria-label="Tanggal check-in"
                />
              </span>
            </label>

            <label className="flex items-center gap-3 border-b border-[#E7C9A8] px-3 py-2 md:border-b-0 md:border-r">
              <span className="min-w-0">
                <span className="block font-serif text-xs font-semibold text-[#57371F]">
                  Check-out Date
                </span>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today || undefined}
                  onChange={(event) => setCheckOut(event.target.value)}
                  className="mt-1 w-full bg-transparent text-xs text-[#795D43] outline-none"
                  aria-label="Tanggal check-out"
                />
              </span>
            </label>

            <label className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block font-serif text-xs font-semibold text-[#57371F]">
                  Jumlah Tamu
                </span>
                <select
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                  className="mt-1 w-full bg-transparent text-xs text-[#795D43] outline-none"
                  aria-label="Jumlah tamu"
                >
                  <option value="1">1 Tamu</option>
                  <option value="2">2 Tamu</option>
                  <option value="3">3 Tamu</option>
                  <option value="4">4 Tamu</option>
                  <option value="5">5 Tamu</option>
                  <option value="6">6 Tamu</option>
                </select>
              </span>
            </label>

            <button
              type="submit"
              className="flex items-center justify-center rounded-xl bg-[#57371F] px-7 py-4 text-sm font-semibold text-white shadow-md hover:bg-[#3D281C]"
            >
              Cari Kamar
            </button>
          </form>
        </div>

        {/* PEMBATAS GELOMBANG */}
        <div className="pointer-events-none absolute -bottom-[2px] left-0 z-10 w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="h-[85px] w-full md:h-[110px]"
          >
            <path
              d="M0,65 C180,10 310,18 480,55 C680,100 810,100 1000,55 C1190,10 1320,25 1440,55 L1440,120 L0,120 Z"
              fill="#F7E9D8"
            />
          </svg>
        </div>
      </section>

      {/* PILIHAN KAMAR */}
      <section
        id="kamar"
        className="relative bg-[#F7E9D8] px-5 pb-16 pt-24 md:px-10 md:pb-20 md:pt-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#755034]">
                  Tipe Kamar
                </p>
                <span className="h-px w-16 bg-[#B78A60]" />
              </div>

              <h2 className="font-serif text-3xl text-[#4B3020] md:text-4xl">
                Pilihan Kamar untuk Anda
              </h2>

              <p className="mt-2 max-w-lg font-serif text-sm text-[#72583F]">
                Nikmati kenyamanan maksimal dengan pilihan kamar premium yang
                elegan dan modern.
              </p>
            </div>

            <a
              href="/reservasi"
              className="inline-flex w-fit items-center rounded-full border border-[#805735] px-6 py-3 font-serif text-xs font-semibold text-[#57371F] hover:bg-[#EBD5BC]"
            >
              Lihat Semua Kamar
            </a>
          </div>

          {loadingRooms && (
            <div className="py-16 text-center text-[#76563B]">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#D8B995] border-t-[#6B452D]" />
              Memuat pilihan kamar...
            </div>
          )}

          {!loadingRooms && roomError && (
            <div className="rounded-xl border border-[#D8B995] bg-[#FFF9F0] p-6 text-center">
              <p className="font-semibold">
                Data kamar belum dapat ditampilkan.
              </p>
              <p className="mt-2 text-sm text-[#76604D]">{roomError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-[#6B452D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4B2E1C]"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loadingRooms && !roomError && rooms.length === 0 && (
            <div className="rounded-xl bg-[#FFF9F0] p-10 text-center text-[#76604D]">
              Belum ada tipe kamar yang tersedia.
            </div>
          )}

          {!loadingRooms && !roomError && rooms.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const availableRooms = (room.rooms || []).filter(
                  (item) => item.status === "TERSEDIA"
                );

                return (
                  <article
                    key={room.id}
                    className="group overflow-hidden rounded-xl border border-[#E7CFB5] bg-[#FFF4E7] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="h-[205px] overflow-hidden md:h-[220px]">
                      <img
                        src={
                          roomImages[room.name] ||
                          roomImages["Standard Room"]
                        }
                        alt={room.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    </div>

                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-serif text-lg font-semibold text-[#4B3020]">
                          {room.name}
                        </h3>

                        <span className="rounded-full bg-[#F0D2AE] px-3 py-1 text-[10px] font-semibold text-[#654329]">
                          {formatRupiah(room.price)} / malam
                        </span>
                      </div>

                      <p className="mt-2 min-h-10 text-xs leading-5 text-[#765B43]">
                        {room.description ||
                          "Kenyamanan dan suasana hangat untuk menemani perjalanan Anda."}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-[#E8D5C0] pt-3">
                        <span className="text-[11px] text-[#80664D]">
                          {room.capacity} Tamu
                        </span>

                        <span
                          className={`text-[11px] font-semibold ${
                            availableRooms.length > 0
                              ? "text-[#557247]"
                              : "text-[#A34F37]"
                          }`}
                        >
                          {availableRooms.length > 0
                            ? `${availableRooms.length} kamar tersedia`
                            : "Kamar penuh"}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <a
                          href={user ? "/reservasi" : "/login"}
                          aria-disabled={availableRooms.length === 0}
                          className={`inline-flex items-center text-xs font-semibold ${
                            availableRooms.length > 0
                              ? "text-[#68452B] hover:text-[#A16E43]"
                              : "pointer-events-none text-[#A99A8B]"
                          }`}
                        >
                          {availableRooms.length === 0
                            ? "Tidak tersedia"
                            : user
                              ? "Pesan Sekarang"
                              : "Masuk untuk Memesan"}
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FASILITAS UNGGULAN */}
      <section
        id="fasilitas"
        className="bg-[#F7E9D8] px-5 py-3 md:px-10 md:py-5"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-2xl bg-gradient-to-r from-[#57371F] via-[#70492D] to-[#56351F] px-6 py-7 text-[#FFF4E7] shadow-lg md:flex-row md:items-center md:justify-between md:px-8">
          <div className="border-b border-white/40 pb-5 md:w-[27%] md:border-b-0 md:border-r md:pb-0">
            <h2 className="font-serif text-2xl">Fasilitas Unggulan</h2>
            <p className="mt-2 max-w-xs font-serif text-xs leading-5 text-[#F0DDC7]">
              Nikmati berbagai fasilitas terbaik untuk menunjang kenyamanan
              Anda.
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-5">
            {facilities.map((facility) => (
              <div
                key={facility}
                className="flex items-center justify-center text-center"
              >
                <p className="font-serif text-[11px] text-[#FFF4E7]">
                  {facility}
                </p>
              </div>
            ))}
          </div>

          <a
            href="#tentang"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#F5D7B3] px-5 py-3 font-serif text-xs font-semibold text-[#50331F] hover:bg-[#FFE7CC]"
          >
            Selengkapnya
          </a>
        </div>
      </section>

      {/* PENGALAMAN MENGINAP */}
      <section
        id="tentang"
        className="relative overflow-hidden bg-[#F7E9D8] px-5 pb-20 pt-12 md:px-10 md:pb-28 md:pt-16"
      >
        <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-[#E5C5A3]/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
          <div className="relative">
            <div className="overflow-hidden rounded-tl-[150px] rounded-br-[100px] border-[5px] border-[#FFF2E2] shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85"
                alt="Suasana interior NARA HOTEL"
                className="h-[330px] w-full object-cover md:h-[420px]"
              />
            </div>

            <div className="absolute -bottom-5 right-5 rounded-lg bg-[#70492D] px-6 py-4 text-[#FFF4E7] shadow-lg">
              <p className="font-serif text-xl">NARA HOTEL</p>
              <p className="mt-1 text-[9px] tracking-[0.2em]">
                STAY BETTER, FEEL AT HOME
              </p>
            </div>
          </div>

          <div className="relative z-10 md:pl-5">
            <div className="mb-3 flex items-center gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#795638]">
                Pengalaman Menginap
              </p>
              <span className="h-px w-16 bg-[#B78A60]" />
            </div>

            <h2 className="font-serif text-3xl leading-tight text-[#4B3020] md:text-4xl">
              Lebih dari Sekadar Menginap
            </h2>

            <p className="mt-4 max-w-lg font-serif text-sm leading-7 text-[#72583F]">
              Rasakan suasana elegan, pelayanan ramah, dan ketenangan yang
              akan membuat perjalanan Anda menjadi lebih istimewa bersama
              NARA HOTEL.
            </p>

            <a
              href="/reservasi"
              className="mt-7 inline-flex items-center rounded-full border border-[#805735] bg-[#70492D] px-6 py-3 font-serif text-xs font-semibold text-white hover:bg-[#4B3020]"
            >
              Tentang Kami
            </a>
          </div>
        </div>
      </section>

      {/* KONTAK DAN FOOTER */}
      <footer
        id="kontak"
        className="bg-[#3D281C] px-6 pb-6 pt-12 text-[#FFF4E7] md:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/15 pb-9 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="font-serif text-2xl tracking-[0.12em]">
              NARA HOTEL
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-[#E1CBB3]">
              Menghadirkan kenyamanan, kehangatan, dan pengalaman menginap
              yang berkesan untuk setiap perjalanan.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg">Navigasi</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-[#E1CBB3]">
              <a href="#beranda" className="hover:text-white">
                Beranda
              </a>
              <a href="#tentang" className="hover:text-white">
                Tentang Kami
              </a>
              <a href="#kamar" className="hover:text-white">
                Pilihan Kamar
              </a>
              <a href="#fasilitas" className="hover:text-white">
                Fasilitas
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-serif text-lg">Reservasi</h3>

            <p className="mt-4 text-sm leading-7 text-[#E1CBB3]">
              Ingin merencanakan pengalaman menginap bersama NARA HOTEL?
            </p>

            <a
              href={user ? "/reservasi" : "/login"}
              className="mt-4 inline-flex rounded-full bg-[#D8B58C] px-5 py-3 text-xs font-semibold text-[#3D281C] hover:bg-[#F0D7B8]"
            >
              {user ? "Reservasi Sekarang" : "Masuk ke Akun"}
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-7xl pt-6 text-center text-xs text-[#D7C4AF]">
          © 2026 NARA HOTEL. All rights reserved.
        </div>
      </footer>
    </main>
  );
}