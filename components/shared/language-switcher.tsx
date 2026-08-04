"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "./language-provider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "id" ? "en" : "id")}
      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white transition hover:bg-slate-800"
    >
      <Globe size={18} />

      <span>
        {locale === "id" ? "🇮🇩 Indonesia" : "🇺🇸 English"}
      </span>
    </button>
  );
}