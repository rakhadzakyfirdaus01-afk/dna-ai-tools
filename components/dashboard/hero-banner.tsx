import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-8 shadow-2xl">
      <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 left-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur">
            <Sparkles size={16} />
            DNA AI Platform
          </div>

          <h1 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
            Build Faster With
            <br />
            Artificial Intelligence
          </h1>

          <p className="mt-5 max-w-xl text-white/80">
            One dashboard for AI Debugger, Image Prompt,
            AI Design, History, and future AI tools.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              href="/ai-debugger"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:scale-105"
            >
              Start Now
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-white/30 px-6 py-3 text-white transition hover:bg-white/10"
            >
              History
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
            <h3 className="text-3xl font-bold text-white">
              2.4K
            </h3>

            <p className="mt-2 text-white/70">
              AI Requests
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
            <h3 className="text-3xl font-bold text-white">
              99%
            </h3>

            <p className="mt-2 text-white/70">
              Success Rate
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
            <h3 className="text-3xl font-bold text-white">
              3
            </h3>

            <p className="mt-2 text-white/70">
              AI Tools
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 p-6 backdrop-blur">
            <h3 className="text-3xl font-bold text-white">
              24/7
            </h3>

            <p className="mt-2 text-white/70">
              Available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}