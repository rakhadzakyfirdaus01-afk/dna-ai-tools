"use client";

import { useState } from "react";
import {
  FileText,
  Upload,
  Play,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/components/notifications/notification-store";
import { useLanguage } from "@/components/shared/language-provider";

export default function DocumentPage() {
  const { t } = useLanguage();

  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!file) {
      toast.error(t.uploadDocumentToAnalyze);
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("document", file);
      formData.append("prompt", prompt);

      const res = await fetch("/api/document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || t.failedToAnalyzeDocument
        );
      }

      setResult(data.result);

      addNotification({
        feature: "AI Document",
        title: "AI Document selesai",
        message:
          "Dokumen berhasil dianalisis dan hasilnya siap dilihat.",
        type: "success",
        result: data.result,
      });

      toast.success(t.documentAnalyzedSuccessfully);
    } catch (error) {
      console.error(error);

      toast.error(t.failedToAnalyzeDocument);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setFile(null);
    setPrompt("");
    setResult("");

    toast.success(t.clear);
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);

      toast.success(t.copied);
    } catch (error) {
      console.error(error);

      toast.error(t.failedToCopy);
    }
  }

  return (
    <div className="space-y-5 lg:space-y-8">

      {/* =========================
          HEADER
      ========================== */}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-5 shadow-xl lg:rounded-3xl lg:p-8">

        <div className="flex items-start gap-3 lg:items-center lg:gap-4">

          <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur lg:rounded-2xl lg:p-3">

            <FileText
              size={26}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-2xl font-bold text-white lg:text-4xl">
              {t.aiDocumentTitle}
            </h1>

            <p className="mt-2 text-sm text-white/80 lg:text-base">
              {t.aiDocumentDescription}
            </p>

          </div>

        </div>

      </div>

      {/* =========================
          CONTENT
      ========================== */}

      <div className="grid gap-4 lg:gap-6 xl:grid-cols-2">

        {/* =========================
            INPUT
        ========================== */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <label className="mb-4 flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 transition hover:border-cyan-500 lg:mb-5 lg:h-44 lg:rounded-2xl">

            <Upload
              size={34}
              className="mb-3 text-cyan-400"
            />

            <p className="font-semibold text-white">
              {t.uploadDocument}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {t.documentFormats}
            </p>

            {file && (
              <p className="mt-4 break-all text-center text-sm text-cyan-400">
                {file.name}
              </p>
            )}

            <input
              hidden
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                setFile(
                  e.target.files?.[0] || null
                );
              }}
            />

          </label>

          {/* =========================
              PROMPT
          ========================== */}

          <textarea
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
            placeholder={t.askAboutDocument}
            className="h-44 w-full resize-none rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-cyan-500 lg:h-52 lg:rounded-2xl lg:p-5"
          />

          {/* =========================
              BUTTONS
          ========================== */}

          <div className="mt-4 flex flex-col gap-3 lg:mt-5 lg:flex-row">

            <button
              onClick={analyze}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Play size={18} />

              {loading
                ? t.analyzing
                : t.analyze}

            </button>

            <button
              onClick={clearAll}
              disabled={
                !file &&
                !prompt &&
                !result
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:rounded-2xl lg:px-6"
            >

              <Trash2 size={18} />

              {t.clear}

            </button>

          </div>

        </div>

        {/* =========================
            RESULT
        ========================== */}

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl lg:rounded-3xl lg:p-6">

          <div className="mb-5 flex justify-end">

            <button
              onClick={copyResult}
              disabled={!result}
              title={t.copied}
              className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:rounded-2xl lg:p-3"
            >

              <Copy size={18} />

            </button>

          </div>

          {result ? (

            <div className="h-[320px] overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-5 lg:h-[500px] lg:rounded-2xl">

              <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {result}
              </pre>

            </div>

          ) : (

            <div className="flex h-[320px] items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 lg:h-[500px] lg:rounded-2xl">

              <div className="text-center">

                <FileText
                  size={64}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-2xl font-bold text-white">
                  {t.aiDocumentAnalyzer}
                </h2>

                <p className="mt-3 text-slate-400">
                  {t.uploadDocumentToAnalyze}
                </p>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}