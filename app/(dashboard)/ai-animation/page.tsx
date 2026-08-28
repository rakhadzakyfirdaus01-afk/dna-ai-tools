"use client";

import { useLanguage } from "@/components/shared/language-provider";

export default function AIAnimationPage() {
  const { locale } = useLanguage();

  function openVeo() {
    window.open(
      "https://deepmind.google/models/veo/",
      "_blank"
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-white lg:p-8">

      <div className="mb-6 lg:mb-8">

        <h1 className="text-2xl font-bold lg:text-3xl">
          {locale === "id"
            ? "Animasi AI"
            : "AI Animation"}
        </h1>

        <p className="mt-2 text-sm text-slate-400 lg:text-base">
          {locale === "id"
            ? "Buat video AI profesional menggunakan Google Veo."
            : "Create professional AI videos using Google Veo."}
        </p>

      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5 lg:p-8">

        <h2 className="text-lg font-semibold lg:text-xl">
          {locale === "id"
            ? "Animasi AI Google Veo"
            : "Google Veo AI Animation"}
        </h2>

        <p className="mt-3 text-sm text-slate-400 lg:text-base">
          {locale === "id"
            ? "Buat video AI tingkat lanjut dengan teknologi pembuatan video dari Google."
            : "Generate advanced AI videos with Google's video generation technology."}
        </p>

        <button
          onClick={openVeo}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-600 lg:inline-flex lg:w-auto"
        >
          {locale === "id"
            ? "Buka Google Veo"
            : "Open Google Veo"}
        </button>

      </div>

    </div>
  );
}