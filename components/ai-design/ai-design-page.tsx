"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react";

type DesignResult = {
  success: boolean;
  result?: string;
  imageUrl?: string;
  error?: string;
  message?: string;
  aspectRatio?: string;
};

export default function AIDesignPage() {
  const [prompt, setPrompt] = useState("");
  const [designType, setDesignType] = useState("Auto");
  const [style, setStyle] = useState("Auto");
  const [template, setTemplate] = useState("Auto");
  const [size, setSize] = useState("Auto");
  const [color, setColor] = useState("Auto");

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateDesign() {
    if (!prompt.trim()) {
      setError("Silakan masukkan prompt desain terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");

    try {
      const response = await fetch("/api/ai-design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          designType,
          style,
          template,
          size,
          color,
          outputFormat: "PNG",
        }),
      });

      const data: DesignResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Gagal membuat desain."
        );
      }

      const generatedImage =
        data.imageUrl || data.result;

      if (!generatedImage) {
        throw new Error(
          "Desain berhasil dibuat, tetapi gambar tidak ditemukan."
        );
      }

      setImageUrl(generatedImage);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat desain."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadDesign() {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "dna-ai-design.png";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }

  return (
    <div className="min-h-[calc(100vh-120px)] px-4 py-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Palette size={30} />
            </div>

            <div>
              <h1 className="text-3xl font-bold">
                AI Design
              </h1>

              <p className="mt-1 text-sm text-white/80">
                Buat desain menggunakan AI berdasarkan
                kebutuhanmu.
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles
              size={22}
              className="text-purple-400"
            />

            <h2 className="text-xl font-bold text-white">
              Buat Desain
            </h2>
          </div>

          <p className="mb-3 text-sm text-slate-400">
            Jelaskan secara detail desain yang ingin
            dibuat oleh AI.
          </p>

          {/* PROMPT */}
          <textarea
            value={prompt}
            onChange={(event) =>
              setPrompt(event.target.value)
            }
            placeholder="Contoh: Buat poster lowongan kerja modern untuk posisi Frontend Developer..."
            className="min-h-[180px] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-500"
          />

          {/* OPTIONS */}
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">

            <SelectField
              label="Jenis Desain"
              value={designType}
              onChange={setDesignType}
              options={[
                "Auto",
                "Poster",
                "Flyer",
                "Banner",
                "Brosur",
                "Logo",
                "Thumbnail",
                "Undangan",
                "Sosial Media",
              ]}
            />

            <SelectField
              label="Gaya"
              value={style}
              onChange={setStyle}
              options={[
                "Auto",
                "Modern",
                "Minimalis",
                "Profesional",
                "Luxury",
                "Cinematic",
                "Playful",
                "Photorealistic",
                "Illustration",
              ]}
            />

            <SelectField
              label="Template"
              value={template}
              onChange={setTemplate}
              options={[
                "Auto",
                "Clean",
                "Modern",
                "Elegant",
                "Bold",
                "Creative",
              ]}
            />

            <SelectField
              label="Ukuran"
              value={size}
              onChange={setSize}
              options={[
                "Auto",
                "Square",
                "Portrait",
                "Landscape",
                "Instagram Post",
                "Instagram Story",
                "YouTube Thumbnail",
              ]}
            />

            <SelectField
              label="Warna"
              value={color}
              onChange={setColor}
              options={[
                "Auto",
                "Biru",
                "Merah",
                "Hijau",
                "Ungu",
                "Hitam",
                "Putih",
                "Gold",
              ]}
            />
          </div>

          {/* ERROR */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* GENERATE */}
          <button
            type="button"
            onClick={generateDesign}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Sedang membuat desain...
              </>
            ) : (
              <>
                <Palette size={20} />
                Generate Desain
              </>
            )}
          </button>
        </div>

        {/* RESULT */}
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                Hasil Desain
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Hasil visual dari AI akan muncul di sini.
              </p>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={downloadDesign}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Download size={17} />
                Download
              </button>
            )}
          </div>

          <div className="flex min-h-[400px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <Loader2
                  size={42}
                  className="animate-spin text-purple-400"
                />

                <div>
                  <p className="font-semibold text-white">
                    AI sedang membuat desain
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Proses ini dapat membutuhkan beberapa
                    saat.
                  </p>
                </div>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Hasil desain AI"
                className="max-h-[900px] w-full object-contain"
              />
            ) : (
              <div className="px-6 text-center">
                <Palette
                  size={48}
                  className="mx-auto text-slate-700"
                />

                <p className="mt-4 font-semibold text-slate-500">
                  Belum ada desain
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Masukkan prompt kemudian tekan
                  Generate Desain.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-purple-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}