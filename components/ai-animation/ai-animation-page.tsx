"use client";

import { Lock } from "lucide-react";

export default function AIAnimationPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-10 shadow-2xl">

        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-yellow-500/10">
          <Lock
            size={56}
            className="text-yellow-400"
          />
        </div>

        <h1 className="mt-8 text-center text-4xl font-bold text-white">
          AI Animation Locked
        </h1>

        <p className="mt-4 text-center text-lg text-slate-400">
          This feature is currently unavailable.
        </p>

        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">
          AI Animation is under development and will be released
          in a future update with Image to Video and Text to Video support.
        </p>

        <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-6">
          <div className="flex items-center justify-center gap-2 text-yellow-300">
            <Lock size={18} />
            <span className="font-semibold">
              Feature Locked
            </span>
          </div>

          <p className="mt-3 text-center text-sm text-yellow-200">
            This feature is temporarily disabled while the AI
            Video Generation service is being integrated.
          </p>
        </div>
                <button
          disabled
          className="mx-auto mt-10 flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-800 px-8 py-4 text-white opacity-70"
        >
          <Lock size={18} />
          Coming Soon
        </button>

      </div>
    </div>
  );
}