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

export default function DocumentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!file) {
      toast.error("Please select a document.");
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
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data.result);

      toast.success("Document analyzed successfully.");
    } catch (error) {
      console.error(error);

      toast.error("Failed to analyze document.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setFile(null);
    setPrompt("");
    setResult("");

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

            <FileText
              size={32}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-4xl font-bold text-white">
              AI Document
            </h1>

            <p className="mt-2 text-white/80">
              Upload PDF, DOCX, or TXT files and let AI summarize,
              explain, or answer questions about the document.
            </p>

          </div>

        </div>

      </div>

      <div className="grid gap-6 xl:grid-cols-2">

        <div className="rounded-3xl border border-slate-800 bg-[#111827] p-6 shadow-xl">

          <label className="mb-5 flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 transition hover:border-cyan-500">

            <Upload
              size={42}
              className="mb-3 text-cyan-400"
            />

            <p className="text-white font-semibold">
              Upload Document
            </p>

            <p className="mt-2 text-sm text-slate-400">
              PDF • DOCX • TXT
            </p>

            {file && (
              <p className="mt-4 text-sm text-cyan-400">
                {file.name}
              </p>
            )}

            <input
              hidden
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />

          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI about your document..."
            className="h-52 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white outline-none focus:border-cyan-500"
          />
                    <div className="mt-5 flex gap-3">

            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={18} />
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            <button
              onClick={clearAll}
              disabled={!file && !prompt && !result}
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

                <FileText
                  size={64}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-2xl font-bold text-white">
                  AI Document Analyzer
                </h2>

                <p className="mt-3 text-slate-400">
                  Upload a document to start analyzing.
                </p>

              </div>

            </div>

          )}

        </div>

      </div>
          </div>
  );
}