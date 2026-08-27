"use client";

import { Globe } from "lucide-react";
import { useLanguage } from "./language-provider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === "id" ? "en" : "id");
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={
        locale === "id"
          ? "Change language to English"
          : "Ganti bahasa ke Indonesia"
      }
      title={
        locale === "id"
          ? "Change language to English"
          : "Ganti bahasa ke Indonesia"
      }
      className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:border-cyan-400 hover:bg-slate-800"
    >
      <Globe
        size={18}
        className="shrink-0 text-cyan-400"
      />

      <span className="whitespace-nowrap">
        {locale === "id"
          ? "🇮🇩 Indonesia"
          : "🇺🇸 English"}
      </span>
    </button>
  );
}