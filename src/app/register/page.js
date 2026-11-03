"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
    setIsSuccess(false);

    if (form.password.length < 8) {
      setMessage("Password minimal 8 karakter.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.message || "Registrasi gagal.");
        return;
      }

      setIsSuccess(true);
      setMessage("Registrasi berhasil! Akun kamu sudah dibuat.");

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch {
      setMessage(
        "Tidak dapat terhubung ke server. Silakan coba lagi."
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
            WELCOME TO
          </p>

          <h1 className="mt-4 text-4xl font-serif font-bold md:text-5xl">
            NARA HOTEL
          </h1>

          <div className="my-6 h-1 w-20 rounded-full bg-[#D9B477]" />

          <h2 className="text-2xl font-semibold">
            Pengalaman Menginap yang Berkesan
          </h2>

          <p className="mt-4 leading-7 text-[#E8D9C9]">
            Buat akun untuk melakukan reservasi kamar, melihat
            detail pemesanan, dan menikmati pengalaman menginap
            yang nyaman bersama NARA HOTEL.
          </p>

          <p className="mt-10 text-sm text-[#DCC7B1]">
            Comfort, Warmth, and Hospitality.
          </p>
        </section>

        <section className="p-7 md:p-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#A17B54]">
            Create Account
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Daftar Akun
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Lengkapi data berikut untuk membuat akun baru.
          </p>

          {message && (
            <div
              className={`mt-5 rounded-xl p-3 text-sm ${
                isSuccess
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium">
                Nama Lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
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
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Nomor Telepon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimal 8 karakter"
                minLength={8}
                required
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Ulangi password"
                minLength={8}
                required
                className="w-full rounded-xl border border-[#E4D7C8] px-4 py-3 outline-none transition focus:border-[#8B6749] focus:ring-2 focus:ring-[#8B6749]/20"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#684B38] px-4 py-3 font-semibold text-white transition hover:bg-[#513927] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Memproses..." : "Daftar Sekarang"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#8B6749] hover:underline"
            >
              Masuk
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