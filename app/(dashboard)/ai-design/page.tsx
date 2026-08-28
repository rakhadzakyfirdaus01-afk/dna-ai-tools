"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react";

export default function AIDesignPage() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function generateDesign() {
    if (!prompt.trim()) {
      setError("Masukkan prompt desain terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");
    setStatus("Mengirim prompt ke AI...");

    try {
      const generateResponse = await fetch("/api/ai-design", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(
          generateData?.error ||
            "Gagal memulai pembuatan desain."
        );
      }

      const projectId = generateData.projectId;

      if (!projectId) {
        throw new Error(
          "Project ID tidak diterima dari server."
        );
      }

      setStatus("AI sedang membuat visual desain...");

      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) =>
          setTimeout(resolve, 2000)
        );

        const statusResponse = await fetch(
          `/api/ai-design/status?id=${encodeURIComponent(
            projectId
          )}`,
          {
            cache: "no-store",
          }
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData?.error ||
              "Gagal mengambil hasil desain."
          );
        }

        if (statusData.status === "complete") {
          if (!statusData.imageUrl) {
            throw new Error(
              "Desain selesai, tetapi URL gambar tidak ditemukan."
            );
          }

          setImageUrl(statusData.imageUrl);
          setStatus("Visual berhasil dibuat.");
          setLoading(false);

          return;
        }

        if (statusData.status === "error") {
          throw new Error(
            "AI gagal membuat visual desain."
          );
        }

        if (statusData.status === "canceled") {
          throw new Error(
            "Pembuatan desain dibatalkan."
          );
        }

        if (statusData.status === "queued") {
          setStatus(
            "Visual masuk antrean AI..."
          );
        } else if (
          statusData.status === "rendering"
        ) {
          setStatus(
            "AI sedang merender visual..."
          );
        }
      }

      throw new Error(
        "Waktu pembuatan desain terlalu lama. Silakan coba lagi."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat membuat desain."
      );

      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] px-4 py-6 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">

        {/* HEADER */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Palette size={30} />
            </div>

            <div>
              <h1 className="text-3xl font-bold">
                AI Design
              </h1>

              <p className="mt-1 text-white/80">
                Buat desain apa saja menggunakan AI.
              </p>
            </div>
          </div>
        </div>

        {/* GENERATOR */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl lg:p-8">

          <div className="mb-5 flex items-center gap-3">
            <Sparkles
              className="text-purple-400"
              size={24}
            />

            <div>
              <h2 className="text-2xl font-bold text-white">
                Buat Desain
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Jelaskan desain yang ingin dibuat oleh AI.
              </p>
            </div>
          </div>

          {/* PROMPT */}
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError("");
            }}
            disabled={loading}
            placeholder="Contoh: Buat poster iklan Ayam Crispy dengan judul AYAM CRISPY, harga Rp10.000, foto ayam crispy yang menggugah selera, warna merah dan kuning, desain profesional."
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-5 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {/* ERROR */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* STATUS */}
          {status && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm text-purple-300">
              {loading && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              <span>{status}</span>
            </div>
          )}

          {/* BUTTON */}
          <button
            type="button"
            onClick={generateDesign}
            disabled={
              loading || !prompt.trim()
            }
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 font-semibold text-white transition hover:scale-[1.01] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2
                  size={21}
                  className="animate-spin"
                />
                Membuat Desain...
              </>
            ) : (
              <>
                <Palette size={21} />
                Generate Desain
              </>
            )}
          </button>
        </div>

        {/* HASIL */}
        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl lg:p-8">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Hasil Desain
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Visual desain yang dibuat AI akan muncul di sini.
              </p>
            </div>

            {imageUrl && (
              <a
                href={imageUrl}
                download="ai-design.png"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
              >
                <Download size={18} />
                Download
              </a>
            )}
          </div>

          {/* IMAGE RESULT */}
          <div className="flex min-h-[500px] items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-4">

            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Visual desain AI"
                className="max-h-[900px] w-auto max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="text-center text-slate-500">
                <Palette
                  size={50}
                  className="mx-auto mb-4 opacity-40"
                />

                <p className="text-lg font-medium">
                  Belum ada desain
                </p>

                <p className="mt-2 text-sm">
                  Masukkan prompt lalu tekan Generate Desain.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}