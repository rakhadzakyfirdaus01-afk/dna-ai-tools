"use client";

import { Lock } from "lucide-react";

export default function AIDesignPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-10 text-center shadow-xl">

        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/10">
          <Lock
            size={50}
            className="text-yellow-400"
          />
        </div>

        <h1 className="mt-8 text-4xl font-bold text-white">
          AI Design Locked
        </h1>

        <p className="mt-4 text-lg text-slate-400">
          This feature is temporarily unavailable.
        </p>

        <p className="mt-2 text-slate-500">
          We are currently upgrading the AI Image
          Generation service.
        </p>

        <div className="mt-10 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-5">
          <p className="text-sm text-yellow-300">
            🚧 Coming Soon
          </p>
        </div>
                <button
          disabled
          className="mt-8 inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-slate-800 px-6 py-3 text-white opacity-70"
        >
          <Lock
            size={18}
            className="mr-2"
          />
          Locked
        </button>

      </div>
    </div>
  );
}