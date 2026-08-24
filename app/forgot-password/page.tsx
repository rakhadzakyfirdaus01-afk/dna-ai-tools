"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [newPassword, setNewPassword] =
  useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);

try {
  const response = await fetch(
    "/api/forgot-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        newPassword,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    alert(data.message);
    setLoading(false);
    return;
  }

  alert("Password berhasil diubah.");

  setLoading(false);

  window.location.href = "/login";
} catch (error) {
  console.error(error);

  setLoading(false);

  alert("Terjadi kesalahan. Silakan coba lagi.");
}
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

        {/* HEADER */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
            <KeyRound
              size={30}
              className="text-emerald-400"
            />
          </div>

          <h1 className="text-3xl font-bold text-white">
            Forgot Password?
          </h1>

          <p className="mt-2 text-slate-400">
            Enter your email to reset your password.
          </p>

        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <div>

            <label className="mb-2 block text-sm text-slate-300">
              Email
            </label>

            <div className="relative">

              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                className="w-full rounded-xl bg-slate-800 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500"
              />

            </div>

          </div>
            
                       <div>
            <label className="mb-2 block text-sm text-slate-300">
              New Password
            </label>

            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              required
              className="w-full rounded-xl bg-slate-800 py-3 px-4 text-white outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >

            <KeyRound size={18} />

            {loading
              ? "Processing..."
              : "Reset Password"}

          </button>

        </form>

        {/* BACK TO LOGIN */}
        <div className="mt-6 text-center">

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 transition hover:text-emerald-300"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>

        </div>

      </div>
    </div>
  );
}