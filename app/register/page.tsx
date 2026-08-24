"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles,
  UserPlus,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!agreedToTerms) {
      alert(
        "Kamu harus menyetujui Terms of Service dan Privacy Policy."
      );
      return;
    }

    if (password !== confirmPassword) {
      alert("Password dan Confirm Password tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      setLoading(false);

      if (!response.ok) {
        alert(data.message || data.error || "Register gagal.");
        return;
      }

      alert("Register berhasil.");
      router.push("/login");
    } catch (error) {
      setLoading(false);
      alert("Terjadi kesalahan saat melakukan register.");
    }
  }

  return (
    <main className="min-h-screen bg-[#070d1a] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">

        {/* MAIN CARD */}
        <div className="relative grid w-full overflow-hidden rounded-2xl border border-blue-900/40 bg-[#0a1222] shadow-[0_0_80px_rgba(37,99,235,0.06)] lg:grid-cols-2">

          {/* BACKGROUND GLOW */}
          <div className="pointer-events-none absolute left-[-120px] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />

          {/* LEFT SIDE */}
          <section className="relative flex min-h-[700px] flex-col justify-between overflow-hidden px-10 py-10 lg:px-12">

            {/* Decorative DNA */}
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
                Create Account{" "}
                <span className="inline-block">✨</span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Join DNA AI Tools and start your journey
                <br />
                with intelligent productivity.
              </p>

              {/* FEATURES */}
              <div className="mt-8 space-y-5">

                {/* SMART TOOLS */}
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <Sparkles size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Smart Tools
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      Access a wide range of
                      AI-powered tools.
                    </p>
                  </div>
                </div>

                {/* SECURE */}
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Secure & Private
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      Your data is encrypted and
                      always protected.
                    </p>
                  </div>
                </div>

                {/* FAST */}
                <div className="flex gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                    <Zap size={17} />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white">
                      Fast & Reliable
                    </h3>

                    <p className="mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                      We deliver speed and
                      performance you can trust.
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

            <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c1628]/90 p-8 shadow-2xl backdrop-blur-xl">

              {/* TITLE */}
              <div className="mb-7">

                <h1 className="text-2xl font-semibold tracking-tight">
                  Create Account{" "}
                  <span>✨</span>
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                  Fill in the details to create your account.
                </p>

              </div>

              <form
                onSubmit={handleRegister}
                className="space-y-4"
              >

                {/* NAME */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Full Name
                  </label>

                  <div className="relative">

                    <User
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-800 bg-[#101a2c] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

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
                      className="w-full rounded-lg border border-slate-800 bg-[#101a2c] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

                {/* PASSWORD */}
                <div>

                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Password
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
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      required
                      className="w-full rounded-lg border border-slate-800 bg-[#101a2c] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
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
                      className="w-full rounded-lg border border-slate-800 bg-[#101a2c] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
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

                {/* TERMS */}
                <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-slate-400">

                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) =>
                      setAgreedToTerms(e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-slate-700 bg-[#101a2c] text-blue-500 accent-blue-600 focus:ring-blue-500"
                  />

                  <span>
                    I agree to the{" "}
                    <span className="text-blue-400">
                      Terms of Service
                    </span>{" "}
                    and{" "}
                    <span className="text-blue-400">
                      Privacy Policy
                    </span>
                  </span>

                </label>

                {/* REGISTER BUTTON */}
                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <UserPlus size={17} />

                  {loading
                    ? "Creating Account..."
                    : "Create Account"}

                </button>

              </form>

              {/* LOGIN */}
              <div className="mt-7 flex items-center gap-4">

                <div className="h-px flex-1 bg-slate-800" />

                <span className="whitespace-nowrap text-xs text-slate-500">
                  Already have an account?
                </span>

                <Link
                  href="/login"
                  className="whitespace-nowrap text-xs font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Sign In
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