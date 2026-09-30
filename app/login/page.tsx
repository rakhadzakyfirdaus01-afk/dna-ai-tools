"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles,
  LogIn,
  KeyRound,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace("/ai-assistant");
    }
  }, [status, session, router]);

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const err = sp.get("error");
      if (err) {
        setErrorMsg("Nama Pengguna atau PIN salah. Silakan coba lagi.");
      }
    }
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setErrorMsg("Nama Pengguna dan PIN wajib diisi.");
      return;
    }

    if (!/^\d{4,6}$/.test(cleanPin)) {
      setErrorMsg("PIN harus berupa 4 sampai 6 digit angka.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: cleanUsername,
        pin: cleanPin,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setErrorMsg("Nama Pengguna atau PIN tidak cocok.");
        return;
      }

      router.replace("/ai-assistant");
    } catch {
      setLoading(false);
      setErrorMsg("Terjadi kendala saat login. Silakan coba lagi.");
    }
  }

  return (
    <main className="min-h-screen bg-[#070d18] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        {/* MAIN CARD */}
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
                <span>Akses Cepat & Ringkas</span>
              </div>

              <h2 className="mt-4 text-3xl font-bold leading-tight text-white lg:text-4xl">
                Selamat Datang Kembali <span className="inline-block">👋</span>
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Masuk ke platform asisten AI cerdas kamu hanya dengan Nama Pengguna dan PIN 4 Angka.
              </p>

              {/* FEATURES */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <Zap size={16} />
                  </div>
                  <span>Login Instan Sekali Klik</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <KeyRound size={16} />
                  </div>
                  <span>Keamanan PIN 4-6 Digit Tanpa Ribet</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                    <ShieldCheck size={16} />
                  </div>
                  <span>Aman di Semua Perangkat (Laptop, Android & iOS)</span>
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
                  Masuk Akun
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Cukup masukkan Nama Pengguna dan PIN 4 Angka kamu.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/15 p-3.5 text-xs font-medium text-red-300">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
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

                {/* PIN */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-200">
                      PIN Cepat (4 - 6 Angka)
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
                    >
                      Lupa PIN?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Contoh: 1234"
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPin(val);
                      }}
                      required
                      className="w-full rounded-xl border border-slate-800 bg-[#111c2c] py-3.5 pl-10 pr-11 text-sm tracking-widest text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showPin ? <EyeOff size={17} /> : <Eye size={17} />}
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
                      <LogIn size={17} className="transition group-hover:translate-x-0.5" />
                      <span>Masuk Sekarang</span>
                    </>
                  )}
                </button>
              </form>

              {/* FOOTER */}
              <div className="mt-7 text-center text-sm text-slate-400">
                Belum punya akun?{" "}
                <Link
                  href="/register"
                  className="font-medium text-blue-400 transition hover:text-blue-300 underline"
                >
                  Daftar Akun Baru (3 Detik)
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}