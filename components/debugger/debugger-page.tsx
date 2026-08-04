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
    <div className="space-y-8">
  <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-8 shadow-xl">
    <div className="flex items-center gap-4">
      <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
        <Bug className="text-white" size={32} />
      </div>

      <div>
        <h1 className="text-4xl font-bold text-white">
          {t.debugger}
        </h1>

        <p className="mt-2 text-white/80">
          {locale === "id"
            ? "Tanyakan apa saja tentang pemrograman, software, Windows, hardware, jaringan, database, API, atau tempel kode untuk diperbaiki."
            : "Ask anything about programming, software, Windows, hardware, networking, databases, APIs, or paste code to debug."}
        </p>
      </div>
    </div>
  </div>

  <div className="grid gap-6 xl:grid-cols-2">
    <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        spellCheck={false}
        placeholder={
          locale === "id"
            ? "Masukkan pertanyaan atau tempel kode di sini..."
            : "Ask a question or paste your code here..."
        }
        className="h-[500px] w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 p-5 font-mono text-sm text-white outline-none transition-all duration-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
      />

      <div className="mt-5 flex gap-3">
        <button
  onClick={analyze}
  disabled={loading}
  className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
>
  <Play size={18} />

  {loading
    ? (locale === "id" ? "Memproses..." : "Thinking...")
    : (locale === "id" ? "Tanya AI" : "Ask AI")}
</button>

<button
  onClick={clearAll}
  disabled={!prompt && !result}
  className="flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
>
  <Trash2 size={18} />

  {locale === "id" ? "Bersihkan" : "Clear"}
</button>

</div>

</div>

<div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">

  <div className="mb-4 flex justify-end">

    <button
      onClick={copyResult}
      disabled={!result}
      className="rounded-2xl border border-slate-700 bg-slate-900 p-3 transition-all duration-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Copy size={18} />
    </button>

  </div>
  {result ? (
  <div className="h-[500px] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5">
    <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-300">
      {result}
    </pre>
  </div>
) : (
  <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900">
    <div className="text-center">
      <Bug
        size={60}
        className="mx-auto mb-5 text-slate-600"
      />

      <h3 className="text-lg font-semibold text-slate-300">
        {locale === "id"
          ? "Mulai Bertanya ke AI"
          : "Start Asking AI"}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
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