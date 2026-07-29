"use client";

import { useState } from "react";
import {
  Sparkles,
  Copy,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

export default function ImagePromptPage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);
    toast.success(`Selected: ${file.name}`);
  }

  async function generate() {
    if (!image) {
      toast.error("Please choose an image first!");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("image", image);
      formData.append("prompt", prompt);

      const res = await fetch("/api/image-prompt", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to generate prompt"
        );
      }

      setResult(data.result);

      toast.success("Prompt generated!");

          } catch (error) {
      console.error(error);
      toast.error("Failed to generate prompt!");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPrompt("");
    setResult("");
    setImage(null);

    toast.success("Cleared!");
  }

  function copyResult() {
    if (!result) return;

    navigator.clipboard.writeText(result);
    toast.success("Copied!");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles
          className="text-purple-500"
          size={30}
        />

        <div>
          <h1 className="text-3xl font-bold text-white">
            Image Prompt Generator
          </h1>

          <p className="text-slate-400">
            Generate professional prompts for AI image models.
          </p>
        </div>
      </div>

      <div className="space-y-4">

        <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-900 p-6">

          <label
            htmlFor="image-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
          >
            <ImagePlus size={18} />
            Choose Image
          </label>

          <input
            id="image-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {image && (
            <p className="mt-3 text-sm text-green-400">
              Selected File: {image.name}
            </p>
          )}

        </div>

                <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Additional instructions (optional)..."
          className="h-40 w-full rounded-xl bg-slate-900 p-4 text-white outline-none"
        />

      </div>

      <div className="flex flex-wrap gap-3">

        <button
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-purple-600 px-5 py-3 text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate"}
        </button>

        <button
          onClick={clearAll}
          disabled={!prompt && !result && !image}
          className="rounded-xl bg-slate-700 px-5 py-3 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={18} />
        </button>

        <button
          onClick={copyResult}
          disabled={!result}
          className="rounded-xl bg-slate-700 px-5 py-3 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={18} />
        </button>

      </div>

      <div className="min-h-[300px] whitespace-pre-wrap rounded-xl bg-slate-900 p-5 text-white">

        {loading ? (
          <p className="text-slate-400 animate-pulse">
            Generating prompt...
          </p>
        ) : result ? (
          result
        ) : (
          <p className="text-slate-500">
            Generated prompt will appear here...
          </p>
        )}

      </div>
          </div>
  );
}