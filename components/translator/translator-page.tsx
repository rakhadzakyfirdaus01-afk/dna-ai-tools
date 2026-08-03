"use client";

import { useState } from "react";
import {
  Languages,
  Play,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function TranslatorPage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function translate() {
    if (!prompt.trim()) {
      toast.error("Please enter text.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/translator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `Terjemahkan teks berikut ke Bahasa ${language}:\n\n${prompt}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Translation failed");
      }

      setResult(data.result);

      toast.success("Translation completed.");
    } catch (error) {
      console.error(error);

      toast.error("Failed to translate.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPrompt("");
    setResult("");
    setLanguage("Indonesia");

    toast.success("Cleared.");
  }

  function copyResult() {
    if (!result) return;

    navigator.clipboard.writeText(result);

    toast.success("Copied.");
  }

  return (
    <div className="space-y-8">

      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-8 shadow-xl">

        <div className="flex items-center gap-4">

          <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">

            <Languages
              size={32}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-4xl font-bold text-white">
              AI Translator
            </h1>

            <p className="mt-2 text-white/80">
              Translate text into multiple languages using AI.
            </p>

          </div>

        </div>

      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type text here..."
            className="h-52 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white outline-none focus:border-cyan-500"
          />

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-5 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white outline-none"
          >
            <option>Indonesia</option>
            <option>English</option>
            <option>Japanese</option>
            <option>Korean</option>
            <option>Chinese</option>
            <option>Arabic</option>
            <option>French</option>
            <option>German</option>
          </select>
                    <div className="mt-5 flex gap-3">

            <button
              onClick={translate}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={18} />
              {loading ? "Translating..." : "Translate"}
            </button>

            <button
              onClick={clearAll}
              disabled={!prompt && !result}
              className="flex items-center gap-2 rounded-2xl bg-red-500 px-6 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} />
              Clear
            </button>

          </div>

        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">

          <div className="mb-5 flex justify-end">

            <button
              onClick={copyResult}
              disabled={!result}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-3 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={18} />
            </button>

          </div>

          {result ? (

            <div className="h-[500px] overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5">

              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {result}
              </pre>

            </div>

          ) : (

            <div className="flex h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900">

              <div className="text-center">

                <Languages
                  size={64}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-2xl font-bold text-white">
                  AI Translator
                </h2>

                <p className="mt-3 text-slate-400">
                  Enter text to start translating.
                </p>

              </div>

            </div>

          )}

        </div>

      </div>
          </div>
  );
}