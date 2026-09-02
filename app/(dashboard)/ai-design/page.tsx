"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  Palette,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";

export default function AIDesignPage() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";

  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const ui = {
    headerDescription: isEnglish
      ? "Create any design using AI."
      : "Buat desain apa saja menggunakan AI.",

    createTitle: isEnglish
      ? "Create Design"
      : "Buat Desain",

    createDescription: isEnglish
      ? "Describe the design you want AI to create."
      : "Jelaskan desain yang ingin dibuat oleh AI.",

    placeholder: isEnglish
      ? "Example: Create a Crispy Chicken advertising poster with the title CRISPY CHICKEN, price Rp10,000, appetizing crispy chicken photo, red and yellow colors, and a professional design."
      : "Contoh: Buat poster iklan Ayam Crispy dengan judul AYAM CRISPY, harga Rp10.000, foto ayam crispy yang menggugah selera, warna merah dan kuning, desain profesional.",

    emptyPrompt: isEnglish
      ? "Please enter a design prompt first."
      : "Masukkan prompt desain terlebih dahulu.",

    sending: isEnglish
      ? "Sending prompt to AI..."
      : "Mengirim prompt ke AI...",

    creating: isEnglish
      ? "AI is creating the design visual..."
      : "AI sedang membuat visual desain...",

    created: isEnglish
      ? "Visual created successfully."
      : "Visual berhasil dibuat.",

    tooLong: isEnglish
      ? "Design creation took too long. Please try again."
      : "Waktu pembuatan desain terlalu lama. Silakan coba lagi.",

    noProjectId: isEnglish
      ? "Project ID was not received from the server."
      : "Project ID tidak diterima dari server.",

    generateFailed: isEnglish
      ? "Failed to start design creation."
      : "Gagal memulai pembuatan desain.",

    statusFailed: isEnglish
      ? "Failed to retrieve the design result."
      : "Gagal mengambil hasil desain.",

    missingUrl: isEnglish
      ? "The design is complete, but the image URL was not found."
      : "Desain selesai, tetapi URL gambar tidak ditemukan.",

    aiFailed: isEnglish
      ? "AI failed to create the design visual."
      : "AI gagal membuat visual desain.",

    canceled: isEnglish
      ? "Design creation was canceled."
      : "Pembuatan desain dibatalkan.",

    queued: isEnglish
      ? "Visual added to the AI queue..."
      : "Visual masuk antrean AI...",

    rendering: isEnglish
      ? "AI is rendering the visual..."
      : "AI sedang merender visual...",

    unknownError: isEnglish
      ? "An error occurred while creating the design."
      : "Terjadi kesalahan saat membuat desain.",

    resultTitle: isEnglish
      ? "Design Result"
      : "Hasil Desain",

    resultDescription: isEnglish
      ? "The AI-generated design visual will appear here."
      : "Visual desain yang dibuat AI akan muncul di sini.",

    download: "Download",

    alt: isEnglish
      ? "AI design visual"
      : "Visual desain AI",

    noDesign: isEnglish
      ? "No design yet"
      : "Belum ada desain",

    noDesignDescription: isEnglish
      ? "Enter a prompt, then press Generate Design."
      : "Masukkan prompt lalu tekan Generate Desain.",

    makeDesign: isEnglish
      ? "Creating Design..."
      : "Membuat Desain...",

    generateDesign: isEnglish
      ? "Generate Design"
      : "Generate Desain",
  };

  async function generateDesign() {
    if (!prompt.trim()) {
      setError(ui.emptyPrompt);
      return;
    }

    setLoading(true);
    setError("");
    setImageUrl("");
    setStatus(ui.sending);

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
          generateData?.error || ui.generateFailed
        );
      }

      const projectId = generateData.projectId;

      if (!projectId) {
        throw new Error(ui.noProjectId);
      }

      setStatus(ui.creating);

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
            statusData?.error || ui.statusFailed
          );
        }

        if (statusData.status === "complete") {
          if (!statusData.imageUrl) {
            throw new Error(ui.missingUrl);
          }

          setImageUrl(statusData.imageUrl);
          setStatus(ui.created);
          setLoading(false);

          return;
        }

        if (statusData.status === "error") {
          throw new Error(ui.aiFailed);
        }

        if (statusData.status === "canceled") {
          throw new Error(ui.canceled);
        }

        if (statusData.status === "queued") {
          setStatus(ui.queued);
        } else if (
          statusData.status === "rendering"
        ) {
          setStatus(ui.rendering);
        }
      }

      throw new Error(ui.tooLong);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : ui.unknownError
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
                {ui.headerDescription}
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
                {ui.createTitle}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {ui.createDescription}
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
            placeholder={ui.placeholder}
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
                {ui.makeDesign}
              </>
            ) : (
              <>
                <Palette size={21} />
                {ui.generateDesign}
              </>
            )}
          </button>
        </div>

        {/* HASIL */}
        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl lg:p-8">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {ui.resultTitle}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {ui.resultDescription}
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
                {ui.download}
              </a>
            )}
          </div>

          {/* IMAGE RESULT */}
          <div className="flex min-h-[500px] items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-4">

            {imageUrl ? (
              <img
                src={imageUrl}
                alt={ui.alt}
                className="max-h-[900px] w-auto max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="text-center text-slate-500">
                <Palette
                  size={50}
                  className="mx-auto mb-4 opacity-40"
                />

                <p className="text-lg font-medium">
                  {ui.noDesign}
                </p>

                <p className="mt-2 text-sm">
                  {ui.noDesignDescription}
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}