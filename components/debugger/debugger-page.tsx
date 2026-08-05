"use client";

import { useState } from "react";
import { Bug, Play, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-provider";

export default function DebuggerPage() {
  const { locale, t } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!prompt.trim()) {
      toast.error(
        locale === "id"
          ? "Silakan masukkan pertanyaan atau tempel kode!"
          : "Please enter a question or paste your code!"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/debugger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: prompt,
          locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data.result);

      toast.success(
        locale === "id"
          ? "Jawaban AI berhasil dibuat!"
          : "Response generated!"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        locale === "id"
          ? "Gagal mendapatkan jawaban AI!"
          : "Failed to get AI response!"
      );
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPrompt("");
    setResult("");

    toast.success(locale === "id" ? "Dibersihkan!" : "Cleared!");
  }

  function copyResult() {
    if (!result) return;

    navigator.clipboard.writeText(result);

    toast.success(locale === "id" ? "Disalin!" : "Copied!");
  }

  return (
<div className="space-y-5 lg:space-y-8">
  <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">
    <div className="flex items-start gap-3 lg:items-center lg:gap-4">
      <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">
       <Bug
  className="text-white"
  size={26}
/>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white lg:text-4xl">
          {t.debugger}
        </h1>

        <p className="mt-2 text-sm text-white/80 lg:text-base">
          {locale === "id"
            ? "Tanyakan apa saja tentang pemrograman, software, Windows, hardware, jaringan, database, API, atau tempel kode untuk diperbaiki."
            : "Ask anything about programming, software, Windows, hardware, networking, databases, APIs, or paste code to debug."}
        </p>
      </div>
    </div>
  </div>

  <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        spellCheck={false}
        placeholder={
          locale === "id"
            ? "Masukkan pertanyaan atau tempel kode di sini..."
            : "Ask a question or paste your code here..."
        }
        className="h-[320px] w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none transition-all duration-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 lg:h-[500px] lg:rounded-2xl lg:p-5"
      />

      <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">
        <button
  onClick={analyze}
  disabled={loading}
  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
>
  <Play size={18} />

  {loading
    ? (locale === "id" ? "Memproses..." : "Thinking...")
    : (locale === "id" ? "Tanya AI" : "Ask AI")}
</button>

<button
  onClick={clearAll}
  disabled={!prompt && !result}
  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
>
  <Trash2 size={18} />

  {locale === "id" ? "Bersihkan" : "Clear"}
</button>

</div>

</div>

<div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

  <div className="mb-3 flex justify-end lg:mb-4">

    <button
      onClick={copyResult}
      disabled={!result}
     className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition-all duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
    >
      <Copy size={18} />
    </button>

  </div>
  {result ? (
  <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 lg:h-[500px] lg:rounded-2xl lg:p-5">
    <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-300">
      {result}
    </pre>
  </div>
) : (
  <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">
    <div className="text-center">
      <Bug
  size={48}
  className="mx-auto mb-5 text-slate-600"
/>

      <h3 className="text-base font-semibold text-slate-300 lg:text-lg">
        {locale === "id"
          ? "Mulai Bertanya ke AI"
          : "Start Asking AI"}
      </h3>

      <p className="mt-2 text-xs text-slate-500 lg:text-sm">
        {locale === "id"
          ? "Jawaban AI akan muncul di sini."
          : "Your AI response will appear here."}
      </p>
    </div>
  </div>
)}

</div>
</div>
</div>
);
}