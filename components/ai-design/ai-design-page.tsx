"use client";

import { Lock } from "lucide-react";

export default function AIDesignPage() {
  return (
   <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4 py-6 lg:px-0 lg:py-0">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-xl lg:p-10">

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 lg:h-24 lg:w-24">
          <Lock
  size={42}
  className="text-yellow-400 lg:h-[50px] lg:w-[50px]"
/>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white lg:mt-8 lg:text-4xl">
          AI Design Locked
        </h1>

        <p className="mt-4 text-base text-slate-400 lg:text-lg">
          This feature is temporarily unavailable.
        </p>

        <p className="mt-2 text-sm text-slate-500 lg:text-base">
          We are currently upgrading the AI Image
          Generation service.
        </p>

        <div className="mt-8 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 lg:mt-10 lg:p-5">
          <p className="text-sm text-yellow-300">
            🚧 Coming Soon
          </p>
        </div>
                <button
          disabled
          className="mt-8 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-800 px-6 py-3 text-white opacity-70 lg:w-auto"
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