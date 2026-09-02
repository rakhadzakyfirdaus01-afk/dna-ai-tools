"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles,
  LogIn,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [agreedToTerms, setAgreedToTerms] =
    useState(false);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!agreedToTerms) {
      alert(
        "Kamu harus menyetujui Terms of Service dan Privacy Policy."
      );
      return;
    }

    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      alert("Email atau Password salah!");
      return;
    }

    router.push("/ai-assistant");
  }

  return (
    <main className="min-h-screen bg-[#070d18] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">

        {/* MAIN CARD */}
        <div className="relative grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-blue-900/40 bg-[#0b1220] shadow-[0_0_80px_rgba(37,99,235,0.08)] lg:grid-cols-2">

          {/* BACKGROUND GLOW */}
          <div className="pointer-events-none absolute left-[-120px] top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-blue-500/5 blur-3xl" />

          {/* LEFT SIDE */}
          <section className="relative flex min-h-[650px] flex-col justify-between overflow-hidden px-10 py-10 lg:px-12">

            {/* Decorative DNA background */}
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
                Welcome Back{" "}
                <span className="inline-block">👋</span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Sign in to continue to your account
                <br />
                and explore powerful AI tools.
              </p>

              {/* FEATURES */}
              <div className="mt-8 space-y-5">

                {/* FEATURE 1 */}
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

                {/* FEATURE 2 */}
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

                {/* FEATURE 3 */}
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

            <div className="w-full max-w-lg rounded-2xl border border-blue-900/40 bg-[#0d1726]/95 p-8 shadow-2xl backdrop-blur-xl">

              <div className="mb-7">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Sign In
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                  Enter your credentials to access your account.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
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
                      className="w-full rounded-lg border border-slate-800 bg-[#111c2c] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
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
                      className="w-full rounded-lg border border-slate-800 bg-[#111c2c] py-3 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10"
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

                {/* TERMS + FORGOT */}
                <div className="flex items-center justify-between">

                  <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) =>
                        setAgreedToTerms(
                          e.target.checked
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-blue-500"
                    />

                    <span>
                      I agree to{" "}
                      <span className="text-blue-400">
                        Terms of Service
                      </span>{" "}
                      and{" "}
                      <span className="text-blue-400">
                        Privacy Policy
                      </span>
                    </span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-400 transition hover:text-blue-300"
                  >
                    Forgot password?
                  </Link>

                </div>

                {/* LOGIN BUTTON */}
                <button
                  type="submit"
                  disabled={
                    loading || !agreedToTerms
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogIn size={17} />

                  {loading
                    ? "Signing In..."
                    : "Sign In"}
                </button>

              </form>

              {/* REGISTER */}
              <div className="mt-7 flex items-center gap-4">

                <div className="h-px flex-1 bg-slate-800" />

                <span className="text-xs text-slate-600">
                  Don't have an account?
                </span>

                <Link
                  href="/register"
                  className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Create Account
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