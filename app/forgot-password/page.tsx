"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert("Password dan Confirm Password tidak sama.");
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
          email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            data.error ||
            "Gagal mengubah password."
        );
        return;
      }

      alert(
        data.message ||
          "Password berhasil diubah. Silakan login kembali."
      );

      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      alert(
        "Terjadi kesalahan saat mengubah password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07101f] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="relative grid w-full overflow-hidden rounded-2xl border border-blue-900/40 bg-[#091426] shadow-[0_0_80px_rgba(37,99,235,0.08)] lg:grid-cols-2">

          {/* BACKGROUND GLOW */}
          <div className="pointer-events-none absolute left-[-120px] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />

          {/* LEFT SIDE */}
          <section className="relative flex min-h-[700px] flex-col justify-between overflow-hidden px-10 py-10 lg:px-12">

            {/* DECORATIVE DNA */}
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

                <span className="text-xl font-semibold tracking-tight">
                  DNA AI Tools
                </span>
              </div>
            </div>

            {/* LEFT CONTENT */}
            <div className="relative z-10 mt-12">

              <h2 className="text-3xl font-semibold tracking-tight">
                Secure Your Account{" "}
                <span className="inline-block">🔐</span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Create a new password and regain
                <br />
                secure access to your DNA AI account.
              </p>

              {/* FEATURES */}
              <div className="mt-8 space-y-5">

                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <KeyRound size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Easy Recovery
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      Quickly create a new password
                      for your account.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Secure & Private
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      Your password is protected
                      and securely updated.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <Zap size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Fast & Reliable
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      Get back into your account
                      in just a few steps.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* COPYRIGHT */}
            <div className="relative z-10 mt-10 text-xs text-slate-600">
              © 2026 DNA AI Tools. All rights reserved.
            </div>
          </section>

          {/* RIGHT SIDE */}
          <section className="relative flex items-center justify-center px-6 py-10 lg:px-10">

            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c1627]/95 p-8 shadow-2xl backdrop-blur-xl">

              {/* HEADER */}
              <div className="mb-7">

                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <KeyRound size={21} />
                </div>

                <h1 className="text-2xl font-semibold tracking-tight">
                  Reset Password
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                  Enter your account details to create
                  a new password.
                </p>

              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="email"
                      placeholder="name@email.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-800 bg-[#101b2d] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* NEW PASSWORD */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    New Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="••••••••••"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-slate-800 bg-[#101b2d] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Confirm Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-slate-800 bg-[#101b2d] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>

                {/* RESET BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound size={17} />

                  {loading
                    ? "Updating Password..."
                    : "Reset Password"}
                </button>

              </form>

              {/* BACK TO LOGIN */}
              <div className="mt-7 flex items-center gap-4">

                <div className="h-px flex-1 bg-slate-800" />

                <Link
                  href="/login"
                  className="whitespace-nowrap text-xs font-medium text-blue-400 transition hover:text-blue-300"
                >
                  ← Back to Sign In
                </Link>

                <div className="h-px flex-1 bg-slate-800" />

              </div>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}