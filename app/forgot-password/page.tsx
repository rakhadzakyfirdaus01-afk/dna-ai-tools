"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim();
    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanUsername) {
      setErrorMsg("Nama Pengguna wajib diisi.");
      return;
    }

    if (!cleanNewPin) {
      setErrorMsg("PIN Baru wajib diisi.");
      return;
    }

    if (!/^\d{4,6}$/.test(cleanNewPin)) {
      setErrorMsg("PIN Baru harus berupa 4 sampai 6 digit angka.");
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      setErrorMsg("PIN Baru dan Konfirmasi PIN tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          newPin: cleanNewPin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoading(false);
        setErrorMsg(data.message || "Gagal mengganti PIN.");
        return;
      }

      setSuccessMsg("PIN berhasil diperbarui! Menghubungkan ke AI Assistant...");

      // Langsung login otomatis dengan PIN baru
      const loginRes = await signIn("credentials", {
        username: cleanUsername,
        pin: cleanNewPin,
        redirect: false,
      });

      setLoading(false);

      if (loginRes?.error) {
        router.replace("/login");
        return;
      }

      router.replace("/ai-assistant");
    } catch {
      setLoading(false);
      setErrorMsg("Terjadi kendala saat memperbarui PIN. Silakan coba lagi.");
    }
  }

  return (
    <main className="min-h-screen bg-[#070d18] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="relative grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-blue-900/40 bg-[#0b1220] shadow-[0_0_80px_rgba(37,99,235,0.08)] lg:grid-cols-2">
          {/* BACKGROUND GLOW */}
          <div className="pointer-events-none absolute left-[-120px] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />

          {/* LEFT SIDE */}
          <section className="relative flex min-h-[580px] flex-col justify-between overflow-hidden px-10 py-10 lg:px-12">
            {/* Decorative background */}
            <div className="pointer-events-none absolute left-[-100px] top-20 opacity-[0.06]">
              <div className="h-[500px] w-[220px] rotate-[-15deg] rounded-[50%] border-[18px] border-blue-500" />
            </div>

            {/* LOGO */}
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo-dna.png"
                  alt="DNA AI Tools"
                  width={42}
                  height={42}
                  priority
                  className="object-contain"
                />
                <div>
                  <span className="text-xl font-bold tracking-tight text-white">
                    DNA AI
                  </span>
                  <span className="ml-1 text-sm font-semibold text-blue-500">
                    PLATFORM
                  </span>
                </div>
              </div>
            </div>

            {/* HERO CONTENT */}
            <div className="relative z-10 my-auto py-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                <Sparkles size={13} />
                <span>Pemulihan PIN Akun</span>
              </div>

              <h2 className="mt-4 text-3xl font-bold leading-tight text-white lg:text-4xl">
                Atur Ulang PIN <span className="inline-block">🔐</span>
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Lupa PIN lama kamu? Cukup masukkan Nama Pengguna akun kamu dan buat PIN baru dengan mudah.
              </p>

              {/* FEATURES */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <KeyRound size={16} />
                  </div>
                  <span>Ganti PIN Baru Seketika</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Zap size={16} />
                  </div>
                  <span>Tanpa Perlu Tunggu Kode Email</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <ShieldCheck size={16} />
                  </div>
                  <span>Langsung Masuk Kembali ke Dashboard</span>
                </div>
              </div>
            </div>

            {/* COPYRIGHT */}
            <div className="relative z-10 text-xs text-slate-600">
              © 2026 DNA AI Tools. All rights reserved.
            </div>
          </section>

          {/* RIGHT SIDE (FORM) */}
          <section className="relative flex items-center justify-center px-6 py-10 lg:px-10">
            <div className="w-full max-w-lg rounded-2xl border border-blue-900/40 bg-[#0d1726]/95 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-7">
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Ganti PIN Akun
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Masukkan Nama Pengguna kamu dan tentukan PIN 4 angka baru.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/15 p-3.5 text-xs font-medium text-red-300">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3.5 text-xs font-medium text-emerald-300">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* USERNAME */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Nama Pengguna
                  </label>
                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Contoh: rakha"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-xl border border-slate-800 bg-[#111c2c] py-3.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* NEW PIN */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    PIN Baru (4 - 6 Angka)
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showNewPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Contoh: 1234"
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setNewPin(val);
                      }}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-[#111c2c] py-3.5 pl-10 pr-11 text-sm tracking-widest text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showNewPin ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PIN */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Konfirmasi PIN Baru
                  </label>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Ketik ulang PIN baru"
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setConfirmPin(val);
                      }}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-[#111c2c] py-3.5 pl-10 pr-11 text-sm tracking-widest text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showConfirmPin ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <KeyRound size={17} className="transition group-hover:scale-110" />
                      <span>Simpan PIN Baru & Masuk</span>
                    </>
                  )}
                </button>
              </form>

              {/* FOOTER */}
              <div className="mt-7 text-center text-sm text-slate-400">
                Sudah ingat PIN?{" "}
                <Link
                  href="/login"
                  className="font-medium text-blue-400 transition hover:text-blue-300 underline"
                >
                  Masuk di sini
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}