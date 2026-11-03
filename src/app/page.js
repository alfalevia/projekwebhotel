
"use client";

import { useEffect, useState } from "react";

const roomImages = {
  "Standard Room":
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85",
  "Deluxe Room":
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=85",
  "Suite Room":
    "https://images.unsplash.com/photo-1611892440504-0a1b1c5c9c9a?auto=format&fit=crop&w=900&q=85",
};

const facilities = [
  {
    icon: "✦",
    name: "Restaurant",
    description:
      "Nikmati pilihan hidangan untuk menemani waktu menginap.",
  },
  {
    icon: "◇",
    name: "Swimming Pool",
    description:
      "Bersantai dan menikmati waktu luang dengan nyaman.",
  },
  {
    icon: "⌘",
    name: "Free Wi-Fi",
    description:
      "Tetap terhubung selama berada di hotel.",
  },
  {
    icon: "♧",
    name: "Room Service",
    description:
      "Layanan kamar untuk memenuhi kebutuhan Anda.",
  },
];

function formatRupiah(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(price));
}

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Mengambil data kamar dari database
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
            error.message ||
              "Terjadi kesalahan saat mengambil data kamar."
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

  // Memeriksa sesi login pengguna
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

  // Keluar dari akun
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

  return (
    <main className="min-h-screen bg-[#F8F3EC] text-[#4B2E1C]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#E9DCCB] bg-[#FFF9F0]/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
          <a href="#beranda" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#B89166] text-xl font-semibold">
              N
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-[0.16em]">
                NARA HOTEL
              </h1>
              <p className="text-[9px] tracking-[0.25em] text-[#8B6B50]">
                COMFORT & ELEGANCE
              </p>
            </div>
          </a>

          <div className="hidden items-center gap-8 text-sm md:flex">
            <a href="#beranda" className="transition hover:text-[#B08050]">
              Beranda
            </a>
            <a href="#tentang" className="transition hover:text-[#B08050]">
              Tentang Kami
            </a>
            <a href="#kamar" className="transition hover:text-[#B08050]">
              Kamar
            </a>
            <a href="#fasilitas" className="transition hover:text-[#B08050]">
              Fasilitas
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {loadingUser ? (
              <span className="text-xs text-[#8B6B50]">Memuat...</span>
            ) : user ? (
              <>
                <span className="hidden text-sm text-[#6B452D] sm:inline">
                  Halo, {user.name}
                </span>

                <a
                  href="/reservasi"
                  className="rounded-sm bg-[#6B452D] px-3 py-3 text-xs font-semibold tracking-wide text-white transition hover:bg-[#4B2E1C] sm:px-5 sm:text-sm"
                >
                  Reservasi
                </a>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="border border-[#B89166] px-3 py-3 text-xs font-semibold text-[#6B452D] transition hover:bg-[#EFE4D6] disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  {loggingOut ? "Keluar..." : "Keluar"}
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  className="border border-[#B89166] px-3 py-3 text-xs font-semibold text-[#6B452D] transition hover:bg-[#EFE4D6] sm:px-4 sm:text-sm"
                >
                  Masuk
                </a>

                <a
                  href="/register"
                  className="rounded-sm bg-[#6B452D] px-3 py-3 text-xs font-semibold tracking-wide text-white transition hover:bg-[#4B2E1C] sm:px-5 sm:text-sm"
                >
                  Daftar
                </a>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section
        id="beranda"
        className="relative flex min-h-[600px] items-center bg-cover bg-center md:min-h-[690px]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(43,29,19,0.82), rgba(43,29,19,0.43), rgba(43,29,19,0.12)), url('https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=2000&q=90')",
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-20 md:px-10">
          <div className="max-w-2xl text-[#FFF9F0]">
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#E6C49B] sm:text-sm">
              A Warm Welcome Awaits You
            </p>

            <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
              Temukan Kenyamanan untuk Setiap Perjalanan
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#F0E5D8] md:text-base">
              Rasakan pengalaman menginap yang berkesan dengan suasana hangat,
              fasilitas pilihan, dan pelayanan yang mengutamakan kenyamanan
              Anda.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#kamar"
                className="bg-[#C29A6B] px-7 py-4 text-sm font-semibold text-[#382719] transition hover:bg-[#E0C29C]"
              >
                Pesan Kamar
              </a>

              <a
                href="#kamar"
                className="border border-white/70 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Jelajahi Kamar
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/30 pt-6 text-xs text-[#F0E5D8]">
              <span>✦ Pelayanan Ramah</span>
              <span>✦ Kamar Nyaman</span>
              <span>✦ Fasilitas Lengkap</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section id="tentang" className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#A57A50]">
              Tentang Nara Hotel
            </p>

            <h2 className="text-3xl font-semibold leading-snug md:text-4xl">
              Tempat Beristirahat dengan Suasana yang Berbeda
            </h2>

            <div className="mt-5 h-1 w-16 bg-[#B89166]" />

            <p className="mt-6 leading-8 text-[#76604D]">
              Nara Hotel menghadirkan suasana menginap yang menggabungkan
              kenyamanan, kehangatan, dan sentuhan elegan. Kami ingin setiap
              tamu dapat menikmati waktu beristirahat dengan lebih tenang.
            </p>

            <p className="mt-4 leading-8 text-[#76604D]">
              Melalui sistem reservasi yang mudah digunakan, Anda dapat
              menjelajahi pilihan kamar dan merencanakan pengalaman menginap
              sesuai kebutuhan.
            </p>

            <a
              href="#fasilitas"
              className="mt-7 inline-block border-b border-[#8B5E3C] pb-2 text-sm font-semibold"
            >
              Jelajahi Fasilitas →
            </a>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85"
              alt="Interior hotel dengan dekorasi hangat"
              className="h-[330px] w-full object-cover md:h-[430px]"
            />

            <div className="absolute -bottom-5 -left-3 bg-[#6B452D] px-7 py-5 text-[#FFF9F0] md:-left-6">
              <p className="text-2xl font-semibold">NARA</p>
              <p className="mt-1 text-xs tracking-[0.2em]">FEEL AT HOME</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROOMS FROM DATABASE */}
      <section
        id="kamar"
        className="bg-[#EFE4D6] px-6 py-20 md:px-10 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#A57A50]">
                Akomodasi
              </p>

              <h2 className="text-3xl font-semibold md:text-4xl">
                Pilihan Kamar untuk Anda
              </h2>

              <p className="mt-4 max-w-xl leading-7 text-[#76604D]">
                Temukan kamar yang sesuai dengan kebutuhan perjalanan dan
                kenyamanan Anda.
              </p>
            </div>

            <p className="text-sm text-[#76604D]">
              Harga per malam berdasarkan database
            </p>
          </div>

          {loadingRooms && (
            <div className="py-16 text-center text-[#76604D]">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#D8B995] border-t-[#6B452D]" />
              Memuat pilihan kamar...
            </div>
          )}

          {!loadingRooms && roomError && (
            <div className="border border-[#D8B995] bg-[#FFF9F0] p-6 text-center">
              <p className="font-semibold">
                Data kamar belum dapat ditampilkan.
              </p>
              <p className="mt-2 text-sm text-[#76604D]">{roomError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 bg-[#6B452D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4B2E1C]"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!loadingRooms && !roomError && rooms.length === 0 && (
            <div className="bg-[#FFF9F0] p-10 text-center text-[#76604D]">
              Belum ada tipe kamar yang tersedia.
            </div>
          )}

          {!loadingRooms && !roomError && rooms.length > 0 && (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => {
                const availableRooms = (room.rooms || []).filter(
                  (item) => item.status === "TERSEDIA"
                );

                const features = [
                  `${room.capacity} Tamu`,
                  `${(room.rooms || []).length} Kamar Terdaftar`,
                  `${availableRooms.length} Tersedia`,
                ];

                return (
                  <article
                    key={room.id}
                    className="overflow-hidden bg-[#FFF9F0] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="overflow-hidden">
                      <img
                        src={
                          roomImages[room.name] ||
                          roomImages["Standard Room"]
                        }
                        alt={room.name}
                        className="h-60 w-full object-cover transition duration-500 hover:scale-105"
                      />
                    </div>

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold">{room.name}</h3>

                        <span
                          className={`shrink-0 px-3 py-1 text-xs ${
                            availableRooms.length > 0
                              ? "bg-[#E6EBDD] text-[#42603B]"
                              : "bg-[#F4E2D9] text-[#934D35]"
                          }`}
                        >
                          {availableRooms.length > 0 ? "Tersedia" : "Penuh"}
                        </span>
                      </div>

                      <p className="mt-3 min-h-12 text-sm leading-6 text-[#76604D]">
                        {room.description ||
                          "Kamar nyaman untuk menemani pengalaman menginap Anda."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {features.map((feature) => (
                          <span
                            key={feature}
                            className="border border-[#E5D5C2] px-3 py-2 text-xs text-[#76563B]"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>

                      <div className="mt-6 flex items-end justify-between border-t border-[#E9DCCB] pt-5">
                        <div>
                          <p className="text-xs text-[#8B6B50]">Mulai dari</p>
                          <p className="mt-1 text-lg font-bold">
                            {formatRupiah(room.price)}
                          </p>
                          <p className="text-xs text-[#8B6B50]">per malam</p>
                        </div>

                        <a
                          href={user ? "/reservasi" : "/login"}
                          className={`px-4 py-3 text-sm font-semibold text-white transition ${
                            availableRooms.length > 0
                              ? "bg-[#6B452D] hover:bg-[#4B2E1C]"
                              : "pointer-events-none bg-[#B9A99A]"
                          }`}
                          aria-disabled={availableRooms.length === 0}
                        >
                          {availableRooms.length === 0
                            ? "Kamar Penuh"
                            : user
                              ? "Pilih Kamar"
                              : "Login untuk Memesan"}
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

      {/* FACILITIES */}
      <section id="fasilitas" className="px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#A57A50]">
              Kenyamanan Anda
            </p>

            <h2 className="text-3xl font-semibold md:text-4xl">
              Fasilitas untuk Pengalaman Terbaik
            </h2>

            <p className="mt-4 leading-7 text-[#76604D]">
              Berbagai fasilitas untuk mendukung waktu istirahat dan aktivitas
              Anda selama menginap.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {facilities.map((facility) => (
              <article
                key={facility.name}
                className="border border-[#E5D5C2] bg-[#FFF9F0] p-7 transition hover:border-[#B89166] hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-[#D8B995] text-2xl text-[#8B5E3C]">
                  {facility.icon}
                </div>

                <h3 className="mt-5 text-lg font-semibold">{facility.name}</h3>

                <p className="mt-3 text-sm leading-7 text-[#76604D]">
                  {facility.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RESERVATION CTA */}
      <section
        id="reservasi"
        className="bg-[#5B3A27] px-6 py-16 text-[#FFF9F0] md:px-10 md:py-20"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#E0C29C]">
              Rencanakan Penginapan Anda
            </p>

            <h2 className="text-3xl font-semibold leading-snug md:text-4xl">
              Pengalaman Menginap yang Nyaman Dimulai di Sini
            </h2>

            <p className="mt-4 leading-7 text-[#E9DCCB]">
              Jelajahi pilihan kamar Nara Hotel dan rencanakan waktu menginap
              Anda dengan lebih mudah.
            </p>
          </div>

          <a
            href={user ? "/reservasi" : "/login"}
            className="inline-flex shrink-0 items-center justify-center bg-[#D7B17D] px-8 py-4 text-sm font-semibold text-[#382719] transition hover:bg-[#E8D0AE]"
          >
            {user ? "Reservasi Sekarang →" : "Masuk untuk Reservasi →"}
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#352319] px-6 pb-6 pt-12 text-[#FFF9F0] md:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="text-xl font-bold tracking-[0.16em]">
              NARA HOTEL
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-[#D7C4AF]">
              Menghadirkan kenyamanan, kehangatan, dan pengalaman menginap
              yang berkesan untuk setiap perjalanan.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Navigasi</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-[#D7C4AF]">
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
            <h3 className="font-semibold">Informasi</h3>

            <p className="mt-4 text-sm leading-7 text-[#D7C4AF]">
              NARA HOTEL
              <br />
              Layanan reservasi hotel
              <br />
              Pelayanan untuk kenyamanan Anda
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl pt-6 text-center text-xs text-[#D7C4AF]">
          © 2026 Nara Hotel. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
