"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  Palette,
  Sparkles,
  Plus,
  PanelLeft,
  PanelLeftClose,
  Trash2,
  Edit3,
  Search,
  Folder,
  MessageSquare,
  X,
  Check,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";
import {
  requestNotificationPermission,
  sendBackgroundNotification,
} from "@/lib/push-notification";

export type DesignCategory = "all" | "poster" | "social" | "logo" | "general";

export type DesignSession = {
  id: string;
  title: string;
  category: "poster" | "social" | "logo" | "general";
  createdAt: number;
  updatedAt: number;
  prompt: string;
  imageUrl: string;
  referencePreview: string;
};

export const DESIGN_CATEGORIES: {
  id: DesignCategory;
  labelId: string;
  labelEn: string;
  icon: string;
  badgeColor: string;
}[] = [
  { id: "all", labelId: "Semua", labelEn: "All", icon: "🎨", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "poster", labelId: "Poster & Iklan", labelEn: "Poster & Ads", icon: "📢", badgeColor: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
  { id: "social", labelId: "Social Media", labelEn: "Social Media", icon: "📱", badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  { id: "logo", labelId: "Logo & Banner", labelEn: "Logo & Banner", icon: "✨", badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { id: "general", labelId: "Umum", labelEn: "General", icon: "📁", badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
];

const DESIGN_SESSIONS_STORAGE_KEY = "dna_ai_design_sessions_v1";

function createNewDesignSession(
  category: "poster" | "social" | "logo" | "general" = "poster",
  isEn = false
): DesignSession {
  return {
    id: "designsession-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title: isEn ? "New Design" : "Desain Baru",
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    prompt: "",
    imageUrl: "",
    referencePreview: "",
  };
}

function formatTimeAgo(timestamp: number, locale = "id"): string {
  if (!timestamp) return "";
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  const isEn = locale === "en";
  if (diff < 60) return isEn ? "Just now" : "Barusan";
  if (diff < 3600) return `${Math.floor(diff / 60)} ${isEn ? "m ago" : "m lalu"}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${isEn ? "h ago" : "j lalu"}`;
  return new Date(timestamp).toLocaleDateString(isEn ? "en-US" : "id-ID", {
    month: "short",
    day: "numeric",
  });
}

export default function AIDesignPage() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [referenceImage, setReferenceImage] =
    useState<File | null>(null);
  const [referencePreview, setReferencePreview] =
    useState("");
  const [detectedRatio, setDetectedRatio] = useState<string>("landscape");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Multi-Design / Session States
  const [sessions, setSessions] = useState<DesignSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<DesignCategory>("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [categoryMenuSessionId, setCategoryMenuSessionId] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // 1. Load from LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DESIGN_SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: DesignSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          setPrompt(parsed[0].prompt || "");
          setImageUrl(parsed[0].imageUrl || "");
          setReferencePreview(parsed[0].referencePreview || "");
          isInitialLoadRef.current = false;
          return;
        }
      }
    } catch (e) {
      console.error("Error loading design sessions:", e);
    }
    const defaultSession = createNewDesignSession("poster", locale === "en");
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    isInitialLoadRef.current = false;
  }, []);

  // Cek apakah ada prompt yang dikirim dari Showcase Gallery
  useEffect(() => {
    try {
      const showcasePrompt = sessionStorage.getItem("showcase_prompt");
      if (showcasePrompt) {
        setPrompt(showcasePrompt);
        sessionStorage.removeItem("showcase_prompt");
      }
    } catch {}
  }, []);

  // 2. Sync changes to active session and LocalStorage
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSessionId) return;

    setSessions((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        if (s.id === activeSessionId) {
          let newTitle = s.title;
          const defaultTitles = ["Desain Baru", "New Design"];
          if (defaultTitles.includes(s.title) && prompt.trim()) {
            newTitle = prompt.slice(0, 30).trim() + (prompt.length > 30 ? "..." : "");
          }
          changed = true;
          return {
            ...s,
            title: newTitle,
            prompt,
            imageUrl,
            referencePreview,
            updatedAt: Date.now(),
          };
        }
        return s;
      });

      if (changed) {
        try {
          localStorage.setItem(DESIGN_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, [prompt, imageUrl, referencePreview, activeSessionId]);

  function handleSelectSession(targetId: string) {
    if (targetId === activeSessionId) {
      setMobileSidebarOpen(false);
      return;
    }
    const target = sessions.find((s) => s.id === targetId);
    if (!target) return;
    setActiveSessionId(targetId);
    setPrompt(target.prompt || "");
    setImageUrl(target.imageUrl || "");
    setReferencePreview(target.referencePreview || "");
    setReferenceImage(null);
    setStatus("");
    setError("");
    setMobileSidebarOpen(false);
  }

  function handleCreateNewDesign(category?: "poster" | "social" | "logo" | "general") {
    const cat = category || (selectedCategory === "all" ? "poster" : selectedCategory);
    const fresh = createNewDesignSession(cat, isEnglish);
    setSessions((prev) => {
      const next = [fresh, ...prev];
      try {
        localStorage.setItem(DESIGN_SESSIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveSessionId(fresh.id);
    setPrompt("");
    setImageUrl("");
    setReferencePreview("");
    setReferenceImage(null);
    setStatus("");
    setError("");
    setMobileSidebarOpen(false);
  }

  function handleDeleteSession(targetId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== targetId);
      if (remaining.length === 0) {
        const fresh = createNewDesignSession("poster", isEnglish);
        remaining.push(fresh);
        setActiveSessionId(fresh.id);
        setPrompt("");
        setImageUrl("");
        setReferencePreview("");
        setReferenceImage(null);
      } else if (activeSessionId === targetId) {
        const nextActive = remaining[0];
        setActiveSessionId(nextActive.id);
        setPrompt(nextActive.prompt || "");
        setImageUrl(nextActive.imageUrl || "");
        setReferencePreview(nextActive.referencePreview || "");
        setReferenceImage(null);
      }
      try {
        localStorage.setItem(DESIGN_SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });
  }

  function handleStartRename(session: DesignSession, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  }

  function handleSaveRename(targetId: string) {
    if (!editingTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === targetId ? { ...s, title: editingTitle.trim() } : s));
      try {
        localStorage.setItem(DESIGN_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setEditingSessionId(null);
  }

  function handleChangeCategory(targetId: string, newCat: "poster" | "social" | "logo" | "general", e?: React.MouseEvent) {
    e?.stopPropagation();
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === targetId ? { ...s, category: newCat } : s));
      try {
        localStorage.setItem(DESIGN_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCategoryMenuSessionId(null);
  }

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeCategoryMeta = DESIGN_CATEGORIES.find((c) => c.id === currentSession?.category) || DESIGN_CATEGORIES[1];

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch =
        !sessionSearch.trim() ||
        s.title.toLowerCase().includes(sessionSearch.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [sessions, selectedCategory, sessionSearch]);

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

    editImage: isEnglish
      ? "Edit Image"
      : "Edit Gambar",

    attach: isEnglish
      ? "Attach"
      : "Lampirkan",

    camera: isEnglish
      ? "Camera"
      : "Kamera",

    attachedImage: isEnglish
      ? "Attached image"
      : "Gambar terlampir",

    removeImage: isEnglish
      ? "Remove image"
      : "Hapus gambar",

    backToAssistant: isEnglish
      ? "Back to AI Assistant"
      : "Kembali ke AI Asisten",
  };

  function handleReferenceImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        isEnglish
          ? "Please select an image file."
          : "Pilih file gambar."
      );
      return;
    }

    setError("");
    setReferenceImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > img.naturalHeight * 1.2) {
        setDetectedRatio("landscape");
      } else if (img.naturalHeight > img.naturalWidth * 1.2) {
        setDetectedRatio("portrait");
      } else {
        setDetectedRatio("square");
      }
    };
    img.src = previewUrl;

    setReferencePreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return previewUrl;
    });
  }

  function removeReferenceImage() {
    setReferenceImage(null);

    setReferencePreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return "";
    });
  }

  async function compressImageForUpload(file: File): Promise<Blob> {
    // If file is already small JPEG (< 400KB), return as is
    if (file.size <= 400 * 1024 && file.type === "image/jpeg") {
      return file;
    }

    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            try {
              const maxDimension = 1280;
              let width = img.naturalWidth || img.width || 1280;
              let height = img.naturalHeight || img.height || 720;

              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = Math.round((height * maxDimension) / width);
                  width = maxDimension;
                } else {
                  width = Math.round((width * maxDimension) / height);
                  height = maxDimension;
                }
              }

              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(file);
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    resolve(file);
                  }
                },
                "image/jpeg",
                0.85
              );
            } catch {
              resolve(file);
            }
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

  async function generateDesign() {
    const finalPrompt = prompt.trim() || (referenceImage ? "buat gambar persis seperti ini" : "");
    if (!finalPrompt) {
      setError(ui.emptyPrompt);
      return;
    }

    // Minta izin notifikasi HP agar siap mengirim pemberitahuan saat user buka aplikasi lain
    requestNotificationPermission().catch(() => {});

    setLoading(true);
    setError("");
    setImageUrl("");
    setStatus(ui.sending);

    try {
      const formData = new FormData();

      formData.append(
        "prompt",
        finalPrompt
      );

      formData.append(
        "designType",
        "Auto"
      );

      formData.append(
        "style",
        "Auto"
      );

      formData.append(
        "template",
        "Auto"
      );

      formData.append(
        "size",
        referenceImage ? detectedRatio : "Auto"
      );

      formData.append(
        "color",
        "Auto"
      );

      if (referenceImage) {
        try {
          const optimizedBlob = await compressImageForUpload(referenceImage);
          formData.append(
            "referenceImage",
            optimizedBlob,
            "reference.jpg"
          );
        } catch {
          formData.append(
            "referenceImage",
            referenceImage
          );
        }
      }

      const generateResponse = await fetch(
        "/api/ai-design",
        {
          method: "POST",
          body: formData,
        }
      );

      let generateData: any = null;
      let responseText = "";
      try {
        responseText = await generateResponse.text();
        generateData = JSON.parse(responseText);
      } catch {
        // Response bukan JSON
      }

      if (!generateResponse.ok) {
        if (
          generateResponse.status === 413 ||
          responseText.includes("Request Entity Too Large")
        ) {
          throw new Error(
            isEnglish
              ? "Image file is too large. Please use a smaller image."
              : "Ukuran file gambar terlalu besar. Silakan gunakan gambar yang lebih kecil."
          );
        }
        throw new Error(
          generateData?.error || responseText || ui.generateFailed
        );
      }

      const projectId =
        generateData?.projectId;

      if (!projectId) {
        throw new Error(ui.noProjectId);
      }

      setStatus(ui.creating);

      for (
        let attempt = 0;
        attempt < 60;
        attempt++
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 2000)
        );

        const statusResponse = await fetch(
          `/api/ai-design/status?id=${encodeURIComponent(
            projectId
          )}&prompt=${encodeURIComponent(
            prompt.trim()
          )}`,
          {
            cache: "no-store",
          }
        );

        const statusData =
          await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData?.error ||
              ui.statusFailed
          );
        }

        if (statusData.status === "complete") {
          if (!statusData.imageUrl) {
            throw new Error(ui.missingUrl);
          }

          setImageUrl(statusData.imageUrl);
          setStatus(ui.created);
          setLoading(false);

          // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
          if (typeof document !== "undefined" && document.hidden) {
            const previewMsg = isEnglish
              ? "Your AI design visual is ready! Tap to view and download."
              : "Desain visual AI kamu sudah selesai dibuat! Ketuk untuk melihat hasilnya.";

            sendBackgroundNotification({
              title: "DNA AI Design - Desain Selesai! 🎨",
              body: previewMsg,
              url: "/ai-design",
              tag: "dna-ai-design-done",
            }).catch(() => {});
          }

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

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI Design - Pemberitahuan",
          body: isEnglish
            ? "An error occurred while generating design visual. Tap to check."
            : "Terjadi kendala saat membuat desain visual AI. Ketuk untuk memeriksa.",
          url: "/ai-design",
          tag: "dna-ai-design-error",
        }).catch(() => {});
      }

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

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-pink-400" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {isEnglish ? "Designs & Sessions" : "Daftar Desain AI"}
          </span>
          <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-400 border border-pink-500/20">
            {sessions.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            setMobileSidebarOpen(false);
          }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          title={isEnglish ? "Close" : "Tutup"}
        >
          <X size={18} />
        </button>
      </div>

      {/* + DESAIN BARU BUTTON */}
      <button
        type="button"
        onClick={() => handleCreateNewDesign()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus size={16} />
        <span>{isEnglish ? "+ New Design" : "+ Desain Baru"}</span>
      </button>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={sessionSearch}
          onChange={(e) => setSessionSearch(e.target.value)}
          placeholder={isEnglish ? "Search designs..." : "Cari desain..."}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-7 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-pink-500/50"
        />
        {sessionSearch && (
          <button
            type="button"
            onClick={() => setSessionSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* FOLDER / CATEGORY TABS */}
      <div>
        <div className="mb-1 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
          <span>{isEnglish ? "FOLDERS" : "FOLDER SESI"}</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {DESIGN_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                    : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{isEnglish ? cat.labelEn : cat.labelId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DESIGNS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <p>{isEnglish ? "No designs found." : "Belum ada desain di folder ini."}</p>
            <button
              type="button"
              onClick={() => handleCreateNewDesign(selectedCategory === "all" ? "poster" : selectedCategory)}
              className="mt-2 text-pink-400 hover:underline"
            >
              {isEnglish ? "+ Create new design" : "+ Buat desain baru"}
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const catMeta = DESIGN_CATEGORIES.find((c) => c.id === session.category) || DESIGN_CATEGORIES[1];
            const isEditing = editingSessionId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer border ${
                  isActive
                    ? "bg-pink-500/10 border-pink-500/40 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                    : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {session.imageUrl ? (
                    <img
                      src={session.imageUrl}
                      alt="Thumbnail"
                      className="h-8 w-8 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <span className="text-sm shrink-0">{catMeta.icon}</span>
                  )}

                  {isEditing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveRename(session.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleSaveRename(session.id)}
                        autoFocus
                        className="w-full rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white outline-none border border-pink-500"
                      />
                      <button type="submit" className="text-pink-400 hover:text-white">
                        <Check size={12} />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-5">
                        {session.title}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {session.imageUrl ? (isEnglish ? "Visual ready" : "Gambar siap") : (isEnglish ? "Draft" : "Draf")} • {formatTimeAgo(session.updatedAt, locale)}
                      </p>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS (Rename, Change Folder, Delete) */}
                {!isEditing && (
                  <div
                    className={`flex items-center gap-1 shrink-0 ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    } transition`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Category / Folder picker */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryMenuSessionId(
                            categoryMenuSessionId === session.id ? null : session.id
                          )
                        }
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-pink-300 transition"
                        title={isEnglish ? "Move to folder" : "Pindah folder"}
                      >
                        <Folder size={12} />
                      </button>

                      {categoryMenuSessionId === session.id && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur">
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                            {isEnglish ? "Select Folder" : "Pilih Folder"}
                          </div>
                          {DESIGN_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={(e) => handleChangeCategory(session.id, cat.id as any, e)}
                              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-left text-slate-200 hover:bg-slate-800 transition"
                            >
                              <span>{cat.icon}</span>
                              <span className="truncate">{isEnglish ? cat.labelEn : cat.labelId}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rename */}
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(session, e)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                      title={isEnglish ? "Rename" : "Ubah nama"}
                    >
                      <Edit3 size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                      title={isEnglish ? "Delete" : "Hapus desain"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-120px)] px-4 py-6 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">

        {/* HEADER */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen((prev) => !prev);
                  setMobileSidebarOpen((prev) => !prev);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold transition ${
                  sidebarOpen || mobileSidebarOpen
                    ? "border-pink-300 bg-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}
                title={sidebarOpen ? (isEnglish ? "Hide Designs" : "Sembunyikan Desain") : (isEnglish ? "Show Designs" : "Daftar Desain")}
              >
                <PanelLeft size={18} />
                <span className="hidden sm:inline">{isEnglish ? "Designs" : "Daftar Desain"}</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  {sessions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateNewDesign()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-700 shadow-lg transition hover:bg-white/90 active:scale-95"
                title={isEnglish ? "New Design" : "+ Desain Baru"}
              >
                <Plus size={18} />
                <span>{isEnglish ? "New Design" : "+ Desain Baru"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push("/ai-assistant")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <ArrowLeft size={18} />
                {ui.backToAssistant}
              </button>
            </div>

          </div>
        </div>

        {/* MAIN LAYOUT: SIDEBAR + GENERATOR */}
        <div className="relative flex gap-6 items-start">
          {/* DESKTOP SIDEBAR */}
          {sidebarOpen && (
            <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden min-h-[580px] max-h-[780px] transition-all duration-300">
              {renderSidebarContent()}
            </aside>
          )}

          {/* MOBILE DRAWER */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-50 flex md:hidden bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <div
                className="w-80 max-w-[85vw] h-full flex flex-col bg-slate-900 border-r border-slate-700 shadow-2xl animate-in slide-in-from-left duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {renderSidebarContent()}
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-6">
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

          {/* IMAGE INPUT */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              id="ai-design-attachment"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleReferenceImage}
              disabled={loading}
              className="hidden"
            />

            <label
              htmlFor="ai-design-attachment"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <span>📎</span>
              {ui.attach}
            </label>

            <input
              id="ai-design-camera"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReferenceImage}
              disabled={loading}
              className="hidden"
            />

            <label
              htmlFor="ai-design-camera"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 md:hidden"
            >
              <span>📷</span>
              {ui.camera}
            </label>
          </div>

          {referencePreview && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-300">
                  {ui.attachedImage}
                </span>

                <button
                  type="button"
                  onClick={removeReferenceImage}
                  disabled={loading}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {ui.removeImage}
                </button>
              </div>

              <img
                src={referencePreview}
                alt={ui.attachedImage}
                className="max-h-80 w-full rounded-xl object-contain"
              />

              <p className="mt-2 truncate text-xs text-slate-500">
                {referenceImage?.name}
              </p>
            </div>
          )}

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
                {referenceImage
                  ? ui.editImage
                  : ui.generateDesign}
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

      </div>
    </div>
  );
}