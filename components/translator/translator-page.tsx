"use client";

import { useEffect, useState } from "react";
import {
  Languages,
  Play,
  Copy,
  Trash2,
  Mic,
  MicOff,
} from "lucide-react";
import { toast } from "sonner";

export default function TranslatorPage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("Indonesia");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);

  function startVoice() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
  (window as any).SpeechRecognition ||
  (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "Voice input tidak didukung browser ini."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Silakan bicara...");
    };

    recognition.onresult = (event: any) => {
      const transcript =
        event.results[0][0].transcript;

      setPrompt((current) =>
        current
          ? `${current} ${transcript}`
          : transcript
      );
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Gagal menangkap suara.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

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
        throw new Error(
          data.error || "Translation failed"
        );
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
    <div className="space-y-5 lg:space-y-8">

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">

        <div className="flex items-start gap-3 lg:items-center lg:gap-4">

          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">
            <Languages
              size={26}
              className="text-white"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white lg:text-4xl">
              AI Translator
            </h1>

            <p className="mt-2 text-sm text-white/80 lg:text-base">
              Translate text into multiple languages using AI.
            </p>
          </div>

        </div>

      </div>

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type text here..."
            className="h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-cyan-500 lg:h-52 lg:rounded-2xl lg:p-5"
          />

          <div className="mt-4 flex flex-col gap-3 lg:flex-row">

            <button
              onClick={startVoice}
              disabled={isListening}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-3 font-medium text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >
              {isListening ? (
                <>
                  <MicOff size={18} />
                  Listening...
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Voice
                </>
              )}
            </button>

          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none lg:mt-5 lg:rounded-2xl lg:p-4"
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

          <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

            <button
              onClick={translate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >
              <Play size={18} />

              {loading
                ? "Translating..."
                : "Translate"}
            </button>

            <button
              onClick={clearAll}
              disabled={!prompt && !result}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >
              <Trash2 size={18} />

              Clear
            </button>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <div className="mb-4 flex justify-end lg:mb-5">

            <button
              onClick={copyResult}
              disabled={!result}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
            >
              <Copy size={18} />
            </button>

          </div>

          {result ? (

            <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-4 lg:h-[500px] lg:rounded-2xl lg:p-5">

              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {result}
              </pre>

            </div>

          ) : (

            <div className="flex h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">

              <div className="text-center">

                <Languages
                  size={48}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-xl font-bold text-white lg:text-2xl">
                  AI Translator
                </h2>

                <p className="mt-3 text-sm text-slate-400 lg:text-base">
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