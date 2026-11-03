
"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setIsError(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setIsError(true);
        setMessage(result.message || "Login gagal.");
        return;
      }

      setMessage("Login berhasil! Mengarahkan ke NARA HOTEL...");

      // Periksa apakah sesi login dapat dibaca oleh server.
      try {
        const sessionResponse = await fetch("/api/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const sessionResult = await sessionResponse.json();

        if (!sessionResponse.ok || !sessionResult.success) {
          setIsError(true);
          setMessage(
            "Login berhasil, tetapi sesi belum terbaca. Coba login kembali."
          );
          return;
        }
      } catch (sessionError) {
        console.error("Pemeriksaan sesi:", sessionError);

        setIsError(true);
        setMessage(
          "Login berhasil, tetapi sesi belum dapat diperiksa. Silakan coba lagi."
        );
        return;
      }

      // Jika login dan pemeriksaan sesi berhasil,
      // arahkan pengguna ke halaman utama.
      window.location.href = "/";
    } catch (error) {
      console.error("Login error:", error);
      setIsError(true);
      setMessage(
        "Tidak dapat terhubung ke server. Periksa apakah server Next.js berjalan."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F3EB] px-4 py-10 text-[#49372B]">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="flex flex-col justify-center bg-[#684B38] p-8 text-[#FFF8EE] md:p-12">
          <p className="text-sm tracking-[0.3em] text-[#E4C49A]">
            WELCOME BACK
          </p>

          <h1 className="mt-4 font-serif text-4xl font-bold md:text-5xl">
            NARA HOTEL
          </h1>

          <div className="my-6 h-1 w-20 rounded-full bg-[#D9B477]" />

          <h2 className="text-2xl font-semibold">
            Senang Bertemu Kembali
          </h2>

          <p className="mt-4 leading-7 text-[#E8D9C9]">
            Masuk ke akunmu untuk melanjutkan reservasi,
            melihat pemesanan, dan menikmati pengalaman
            menginap yang nyaman bersama NARA HOTEL.
          </p>

          <p className="mt-10 text-sm text-[#DCC7B1]">
            Comfort, Warmth, and Hospitality.
          </p>
        </section>

        <section className="flex flex-col justify-center p-7 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#A17B54]">
            Welcome Back
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Masuk Akun
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Masukkan email dan password akunmu.
          </p>

          {message && (
            <div
              role={isError ? "alert" : "status"}
              className={`mt-5 rounded-xl p-3 text-sm ${
                isError
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-[#E4D7C8] bg-[#F8F3EB] text-[#684B38]"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                required
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Masukkan password"
                required
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#684B38] px-4 py-3 font-semibold text-white transition hover:bg-[#513927] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Memproses..." : "Masuk Sekarang"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#8B6749] hover:underline"
            >
              Daftar di sini
            </Link>
          </p>

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-[#684B38]"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
