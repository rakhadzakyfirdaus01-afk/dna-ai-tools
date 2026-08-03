"use client";

import { useState } from "react";
import {
  ScanText,
  Upload,
 Play,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function OcrPage() {
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!image) {
      toast.error("Please select an image.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("image", image);
      formData.append("prompt", prompt);

      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "OCR failed");
      }

      setResult(data.result);

      toast.success("OCR completed.");
    } catch (error) {
      console.error(error);

      toast.error("Failed to process image.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setImage(null);
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

            <ScanText
              size={32}
              className="text-white"
            />

          </div>

          <div>

            <h1 className="text-4xl font-bold text-white">
              AI OCR
            </h1>

            <p className="mt-2 text-white/80">
              Upload an image and let AI extract, analyze, summarize,
              or explain the text inside it.
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

            <p className="font-semibold text-white">
              Upload Image
            </p>

            <p className="mt-2 text-sm text-slate-400">
              PNG • JPG • JPEG • WEBP
            </p>

            {image && (
              <p className="mt-4 text-sm text-cyan-400">
                {image.name}
              </p>
            )}

            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) =>
                setImage(e.target.files?.[0] || null)
              }
            />

          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI about the uploaded image..."
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
              disabled={!image && !prompt && !result}
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

                <ScanText
                  size={64}
                  className="mx-auto mb-5 text-slate-600"
                />

                <h2 className="text-2xl font-bold text-white">
                  AI OCR
                </h2>

                <p className="mt-3 text-slate-400">
                  Upload an image to extract and analyze text.
                </p>

              </div>

            </div>

          )}

        </div>

      </div>
          </div>
  );
}