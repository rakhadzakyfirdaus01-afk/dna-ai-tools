"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import {
  Wand2,
  Sparkles,
  Layers,
  Upload,
  Download,
  Loader2,
  RefreshCw,
  SplitSquareVertical,
  Maximize2,
  Sliders,
  Check,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";

type StagingPreset = {
  id: string;
  nameId: string;
  nameEn: string;
  icon: string;
  descId: string;
  descEn: string;
};

const STAGING_PRESETS: StagingPreset[] = [
  {
    id: "marble",
    nameId: "Podium Marmer Mewah",
    nameEn: "Luxury Marble Podium",
    icon: "🏛️",
    descId: "Marmer putih Carrara & pencahayaan studio lembut",
    descEn: "White Carrara marble & soft studio lighting",
  },
  {
    id: "wooden",
    nameId: "Meja Kayu & Tanaman",
    nameEn: "Warm Oak & Greenery",
    icon: "🪵",
    descId: "Nuansa kayu alami & bayangan daun monstera estetik",
    descEn: "Natural oak wood & aesthetic monstera leaf shadows",
  },
  {
    id: "nature",
    nameId: "Bebatuan Alam & Air",
    nameEn: "River Stone & Fresh Water",
    icon: "🌊",
    descId: "Batu sungai gelap & tetesan air segar alami",
    descEn: "Dark basalt stones & fresh morning water droplets",
  },
  {
    id: "pastel",
    nameId: "Studio Pastel Modern",
    nameEn: "Minimalist Pastel Studio",
    icon: "🌸",
    descId: "Geometris minimalis & bayangan jendela elegan",
    descEn: "Geometric pedestal & elegant window sunlight",
  },
  {
    id: "cyberpunk",
    nameId: "Neon Tech & Refleksi",
    nameEn: "Cyberpunk Neon Tech",
    icon: "🏙️",
    descId: "Platform gelap reflektif & cahaya neon futuristik",
    descEn: "Dark reflective platform & futuristic neon glow",
  },
  {
    id: "custom",
    nameId: "Suasana Kustom",
    nameEn: "Custom Scene",
    icon: "✍️",
    descId: "Ketik suasana latar yang kamu inginkan secara bebas",
    descEn: "Write any custom scene or background you want",
  },
];

export default function AIStudioPage() {
  const { locale } = useLanguage();
  const isEn = locale === "en";

  const [activeTab, setActiveTab] = useState<"staging" | "remove-bg">("staging");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("marble");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<"square" | "landscape" | "portrait">("square");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>("transparent");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-kompresi gambar di browser agar cepat & tidak melebihi limit
  async function compressImage(file: File): Promise<Blob> {
    if (file.size <= 400 * 1024 && file.type === "image/jpeg") return file;
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new window.Image();
          img.onload = () => {
            const maxDim = 1280;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(file);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => resolve(b || file), "image/jpeg", 0.85);
          };
          img.onerror = () => resolve(file);
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
      } catch {
        resolve(file);
      }
    });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(isEn ? "Please select a valid image file." : "Silakan pilih file gambar yang valid.");
      return;
    }

    setError("");
    setSelectedFile(file);
    setResultUrl("");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Auto-deteksi rasio foto
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth > img.naturalHeight * 1.25) {
        setAspectRatio("landscape");
      } else if (img.naturalHeight > img.naturalWidth * 1.25) {
        setAspectRatio("portrait");
      } else {
        setAspectRatio("square");
      }
    };
    img.src = url;
  }

  async function handleProcess() {
    if (!selectedFile) {
      setError(isEn ? "Please upload a product photo first." : "Unggah foto produk terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const optimizedBlob = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append("image", optimizedBlob, "product.jpg");
      formData.append("action", activeTab === "staging" ? "stage-product" : "remove-bg");
      formData.append("preset", selectedPreset);
      formData.append("customPrompt", customPrompt);
      formData.append("size", aspectRatio);

      const res = await fetch("/api/ai-studio", {
        method: "POST",
        body: formData,
      });

      let data: any = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || text || (isEn ? "Failed to process photo." : "Gagal memproses gambar."));
      }

      setResultUrl(data.resultUrl);
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to process image." : "Terjadi kesalahan saat memproses gambar."));
    } finally {
      setLoading(false);
    }
  }

  async function downloadImage() {
    if (!resultUrl) return;
    try {
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dna-studio-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch {
      window.open(resultUrl, "_blank");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 shadow-lg shadow-purple-500/25">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Magic Studio</h1>
                <p className="text-sm text-slate-400">
                  {isEn
                    ? "Isolate backgrounds & transform product photos into luxury commercial catalog scenes."
                    : "Hapus background & sulap foto produk jualanmu menjadi katalog mewah kelas dunia."}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              onClick={() => {
                setActiveTab("staging");
                setResultUrl("");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "staging"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {isEn ? "Product Staging" : "Studio Foto Produk"}
            </button>
            <button
              onClick={() => {
                setActiveTab("remove-bg");
                setResultUrl("");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "remove-bg"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              {isEn ? "Remove Background" : "Hapus Background"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Sisi Kiri: Upload & Pengaturan */}
          <div className="space-y-6 lg:col-span-5">
            {/* Box Upload */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-semibold text-white">
                {isEn ? "Upload Object / Product Photo" : "Unggah Foto Objek / Produk"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {isEn
                  ? "Supports JPG, PNG, WebP (Higher clarity produces better results)"
                  : "Format JPG, PNG, atau WebP (Foto yang jelas menghasilkan kualitas terbaik)"}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 transition hover:border-purple-500 hover:bg-slate-900/50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">
                    {isEn ? "Click to upload photo" : "Klik untuk upload foto"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {isEn ? "or drag and drop here" : "atau drag & drop gambar ke sini"}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <Image
                      src={previewUrl}
                      alt="Preview Produk"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {isEn ? "Change Photo" : "Ganti Foto Lain"}
                  </button>
                </div>
              )}
            </div>

            {/* Pilihan Rasio Tampilan */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-base font-semibold text-white">
                {isEn ? "Aspect Ratio" : "Rasio Ukuran Hasil"}
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { id: "square", label: "Square (1:1)", sub: "1024x1024" },
                  { id: "landscape", label: "Wide (16:9)", sub: "1344x768" },
                  { id: "portrait", label: "Story (9:16)", sub: "768x1344" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setAspectRatio(r.id as any)}
                    className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 text-center transition ${
                      aspectRatio === r.id
                        ? "border-purple-500 bg-purple-500/15 text-white"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="text-xs font-medium">{r.label}</span>
                    <span className="text-[10px] text-slate-500">{r.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opsi Staging Produk */}
            {activeTab === "staging" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-base font-semibold text-white">
                  {isEn ? "Select Studio Setting" : "Pilih Suasana Studio"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {isEn ? "Pick the aesthetic environment for your product" : "Pilih tempat di mana produkmu akan diletakkan"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {STAGING_PRESETS.map((p) => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPreset(p.id)}
                        className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                          isSelected
                            ? "border-purple-500 bg-purple-500/15 text-white shadow-sm"
                            : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl">{p.icon}</span>
                        <span className="mt-2 text-xs font-medium line-clamp-1">
                          {isEn ? p.nameEn : p.nameId}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedPreset === "custom" && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-slate-300">
                      {isEn ? "Custom Scene Description" : "Deskripsi Suasana Kustom"}
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={
                        isEn
                          ? "e.g., sitting on golden desert sand during sunset with soft warm rim lighting..."
                          : "Contoh: diletakkan di atas pasir pantai saat matahari terbenam dengan deburan ombak lembut..."
                      }
                      className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Opsi Warna untuk Hapus Background */}
            {activeTab === "remove-bg" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
                <h2 className="text-base font-semibold text-white">
                  {isEn ? "Background Color Tint" : "Warna Latar Belakang Baru"}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {[
                    { id: "transparent", label: isEn ? "Transparent" : "Transparan", color: "bg-transparent border-dashed" },
                    { id: "#ffffff", label: isEn ? "Pure White" : "Putih Katalog", color: "bg-white" },
                    { id: "#0f172a", label: isEn ? "Dark Slate" : "Hitam Slate", color: "bg-slate-900" },
                    { id: "#fce7f3", label: isEn ? "Pastel Pink" : "Pastel Pink", color: "bg-pink-100" },
                    { id: "#e0f2fe", label: isEn ? "Soft Blue" : "Soft Blue", color: "bg-sky-100" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setBgColor(c.id)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        bgColor === c.id
                          ? "border-purple-500 bg-purple-500/15 text-white"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full border border-slate-700 ${c.color}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Eksekusi */}
            <button
              onClick={handleProcess}
              disabled={loading || !selectedFile}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{isEn ? "AI is Crafting Studio Visual..." : "AI Sedang Menyulap Foto..."}</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  <span>
                    {activeTab === "staging"
                      ? isEn
                        ? "Generate Studio Photo"
                        : "Generate Foto Studio"
                      : isEn
                      ? "Remove Background Now"
                      : "Hapus Background Sekarang"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Sisi Kanan: Hasil & Before/After */}
          <div className="lg:col-span-7">
            <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isEn ? "Studio Showcase Result" : "Hasil Studio"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isEn ? "Sharp commercial quality with studio lighting" : "Preview hasil olahan AI dengan resolusi tajam"}
                  </p>
                </div>

                {resultUrl && (
                  <div className="flex items-center gap-2">
                    {previewUrl && (
                      <button
                        onClick={() => setShowCompare(!showCompare)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          showCompare
                            ? "border-purple-500 bg-purple-500/20 text-purple-300"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        <SplitSquareVertical className="h-3.5 w-3.5" />
                        {showCompare
                          ? isEn
                            ? "Show Result Only"
                            : "Lihat Hasil Saja"
                          : isEn
                          ? "Compare Before/After"
                          : "Bandingkan (Before/After)"}
                      </button>
                    )}
                    <button
                      onClick={downloadImage}
                      className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download HD
                    </button>
                  </div>
                )}
              </div>

              {/* Canvas / Gambar Result */}
              <div className="mt-6 flex min-h-[480px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                {loading ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                    <p className="text-sm font-medium text-white">
                      {isEn ? "Processing Product Photo..." : "Sedang Memproses Foto Produk..."}
                    </p>
                    <p className="max-w-xs text-xs text-slate-400">
                      {isEn
                        ? "Gemini Vision & FLUX are rendering lighting, surface reflections, and podium atmosphere."
                        : "Gemini Vision & FLUX sedang menyesuaikan pencahayaan, bayangan, dan tekstur studio."}
                    </p>
                  </div>
                ) : resultUrl ? (
                  showCompare && previewUrl ? (
                    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col items-center">
                        <span className="mb-2 text-xs font-medium text-slate-400">
                          {isEn ? "Original (Before)" : "Foto Asli (Before)"}
                        </span>
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-800">
                          <Image src={previewUrl} alt="Before" fill className="object-contain" unoptimized />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="mb-2 text-xs font-medium text-purple-400">
                          {isEn ? "AI Staged (After)" : "Hasil AI (After)"}
                        </span>
                        <div
                          className="relative aspect-square w-full overflow-hidden rounded-xl border border-purple-500/40"
                          style={{ backgroundColor: bgColor !== "transparent" ? bgColor : undefined }}
                        >
                          <Image src={resultUrl} alt="After" fill className="object-contain" unoptimized />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative aspect-square max-h-[520px] w-full overflow-hidden rounded-xl"
                      style={{ backgroundColor: bgColor !== "transparent" ? bgColor : undefined }}
                    >
                      <Image
                        src={resultUrl}
                        alt="Hasil Studio"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-slate-500">
                    <Sparkles className="h-10 w-10 text-slate-700" />
                    <p className="text-sm font-medium">{isEn ? "No result yet" : "Belum ada hasil"}</p>
                    <p className="max-w-xs text-xs">
                      {isEn
                        ? "Upload your image on the left panel and click the generate button."
                        : "Unggah gambar di panel sebelah kiri lalu klik tombol proses."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}