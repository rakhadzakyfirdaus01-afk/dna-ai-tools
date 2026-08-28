"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "@/components/notifications/notification-store";
import { useLanguage } from "@/components/shared/language-provider";

export default function ImagePromptPage() {
  const { locale } = useLanguage();

  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!image) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);

    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);

    toast.success(
      locale === "id"
        ? `Dipilih: ${file.name}`
        : `Selected: ${file.name}`
    );
  }

  async function generate() {
    if (!image) {
      toast.error(
        locale === "id"
          ? "Silakan pilih gambar terlebih dahulu!"
          : "Please choose an image first!"
      );

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
          data.error ||
            (locale === "id"
              ? "Gagal membuat prompt"
              : "Failed to generate prompt")
        );
      }

      setResult(data.result);

      addNotification({
        feature: "Image Prompt Generator",
        title:
          locale === "id"
            ? "Generator Prompt Gambar selesai"
            : "Image Prompt Generator selesai",
        message:
          locale === "id"
            ? "Prompt gambar berhasil dibuat dan siap dilihat."
            : "Image prompt has been generated and is ready to view.",
        type: "success",
        result: data.result,
      });

      toast.success(
        locale === "id"
          ? "Prompt berhasil dibuat!"
          : "Prompt generated!"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        locale === "id"
          ? "Gagal membuat prompt!"
          : "Failed to generate prompt!"
      );
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setPrompt("");
    setResult("");
    setImage(null);
    setPreviewUrl("");

    toast.success(
      locale === "id"
        ? "Berhasil dibersihkan!"
        : "Cleared!"
    );
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);

      toast.success(
        locale === "id"
          ? "Berhasil disalin!"
          : "Copied!"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        locale === "id"
          ? "Gagal menyalin!"
          : "Failed to copy!"
      );
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex items-start gap-3 lg:items-center">

        <Sparkles
          className="mt-1 text-purple-500 lg:mt-0"
          size={24}
        />

        <div>

          <h1 className="text-2xl font-bold text-white lg:text-3xl">
            {locale === "id"
              ? "Generator Prompt Gambar"
              : "Image Prompt Generator"}
          </h1>

          <p className="mt-1 text-sm text-slate-400 lg:text-base">
            {locale === "id"
              ? "Buat prompt profesional untuk model gambar AI."
              : "Generate professional prompts for AI image models."}
          </p>

        </div>

      </div>

      {/* Upload */}

      <div className="space-y-4">

        <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 p-4 transition-all duration-300 lg:p-6">

          <label
            htmlFor="image-upload"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-white transition hover:bg-purple-700 lg:w-auto"
          >

            <ImagePlus size={18} />

            {locale === "id"
              ? "Pilih Gambar"
              : "Choose Image"}

          </label>

          <input
            id="image-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {previewUrl && (
            <>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700">

                <img
                  src={previewUrl}
                  alt={
                    locale === "id"
                      ? "Pratinjau"
                      : "Preview"
                  }
                  className="h-56 w-full object-cover"
                />

              </div>

              <p className="mt-4 break-all text-sm text-green-400">

                {locale === "id"
                  ? "File Dipilih:"
                  : "Selected File:"}{" "}

                {image?.name}

              </p>

            </>
          )}

        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            locale === "id"
              ? "Instruksi tambahan (opsional)..."
              : "Additional instructions (optional)..."
          }
          className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-white outline-none transition focus:border-purple-500 lg:h-40 lg:text-base"
        />

      </div>

      {/* Buttons */}

      <div className="grid grid-cols-1 gap-3 lg:flex lg:flex-wrap">

        <button
          onClick={generate}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 px-5 py-3 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        >

          {loading
            ? locale === "id"
              ? "Membuat..."
              : "Generating..."
            : locale === "id"
              ? "Buat Prompt"
              : "Generate"}

        </button>

        <button
          onClick={clearAll}
          disabled={!prompt && !result && !image}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        >

          <Trash2 size={18} />

          <span className="lg:hidden">
            {locale === "id"
              ? "Bersihkan"
              : "Clear"}
          </span>

        </button>

        <button
          onClick={copyResult}
          disabled={!result}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
        >

          <Copy size={18} />

          <span className="lg:hidden">
            {locale === "id"
              ? "Salin"
              : "Copy"}
          </span>

        </button>

      </div>

      {/* Result */}

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">

        <div className="mb-4 flex items-center justify-between">

          <h2 className="text-lg font-semibold text-white">
            {locale === "id"
              ? "Prompt yang Dihasilkan"
              : "Generated Prompt"}
          </h2>

        </div>

        <div className="min-h-[220px] whitespace-pre-wrap rounded-xl bg-[#111827] p-4 text-sm leading-7 text-slate-200 lg:min-h-[300px] lg:text-base">

          {loading ? (

            <p className="animate-pulse text-slate-400">
              {locale === "id"
                ? "✨ AI sedang membuat prompt..."
                : "✨ AI is generating your prompt..."}
            </p>

          ) : result ? (

            result

          ) : (

            <p className="text-slate-500">
              {locale === "id"
                ? "Prompt yang dihasilkan akan muncul di sini."
                : "Your generated prompt will appear here."}
            </p>

          )}

        </div>

      </div>

    </div>
  );
}