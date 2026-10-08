"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NextImage from "next/image";
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
  Layers,
  Upload,
  RefreshCw,
  SplitSquareVertical,
  Wand2,
} from "lucide-react";
import { useLanguage } from "@/components/shared/language-provider";
import {
  requestNotificationPermission,
  sendBackgroundNotification,
} from "@/lib/push-notification";
import {
  BACKGROUND_CATALOG,
  BACKGROUND_CATEGORIES,
  getBackgroundIcon,
  getBackgroundThumbnail,
  type BackgroundItem,
} from "@/lib/background-catalog";

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

export type StudioCategory = "all" | "product" | "portrait" | "creative" | "general";

export interface StudioSession {
  id: string;
  title: string;
  category: "product" | "portrait" | "creative" | "general";
  createdAt: number;
  updatedAt: number;
  previewUrl: string; // original image data URL
  resultUrl: string; // composited result data URL
  cutoutDataUrl?: string; // transparent cutout data URL
  selectedBgId: string; // ID from BACKGROUND_CATALOG
  customHexColor?: string;
  hasResult: boolean;
}

export const STUDIO_CATEGORIES: {
  id: StudioCategory;
  labelId: string;
  labelEn: string;
  icon: string;
  badgeColor: string;
}[] = [
  { id: "all", labelId: "Semua", labelEn: "All", icon: "✂️", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "product", labelId: "Produk", labelEn: "Product", icon: "🛍️", badgeColor: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
  { id: "portrait", labelId: "Potret", labelEn: "Portrait", icon: "👤", badgeColor: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
  { id: "creative", labelId: "Bunga & Flora", labelEn: "Flora & Art", icon: "🌸", badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { id: "general", labelId: "Umum", labelEn: "General", icon: "📁", badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
];

const DESIGN_SESSIONS_STORAGE_KEY = "dna_ai_design_sessions_v1";
const STUDIO_SESSIONS_STORAGE_KEY = "dna_ai_studio_sessions_v1";

function createNewStudioSession(
  category: "product" | "portrait" | "creative" | "general" = "product",
  isEn = false
): StudioSession {
  return {
    id: "studiosession-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title: isEn ? "New Cutout" : "Hapus Background Baru",
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    previewUrl: "",
    resultUrl: "",
    cutoutDataUrl: "",
    selectedBgId: "transparent",
    hasResult: false,
  };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressImageForStorage(fileOrBlob: File | Blob, maxDim = 800): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let w = img.naturalWidth || img.width || 800;
          let h = img.naturalHeight || img.height || 800;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/webp", 0.85));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(fileOrBlob);
    } catch {
      resolve("");
    }
  });
}

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

function AIDesignContent() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode Tabs: design, remove-bg
  const [activeMainTab, setActiveMainTab] = useState<"design" | "remove-bg">("design");

  // Sync tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "remove-bg" || tabParam === "design") {
      setActiveMainTab(tabParam);
    }
  }, [searchParams]);

  // Studio (Remove-BG) States
  const [studioFile, setStudioFile] = useState<File | null>(null);
  const [studioPreviewUrl, setStudioPreviewUrl] = useState<string>("");
  const [studioResultUrl, setStudioResultUrl] = useState<string>("");
  const [studioLoading, setStudioLoading] = useState<boolean>(false);
  const [studioProgress, setStudioProgress] = useState<string>("");
  const [studioCutoutBlob, setStudioCutoutBlob] = useState<Blob | null>(null);
  const [studioError, setStudioError] = useState<string>("");
  const [studioShowCompare, setStudioShowCompare] = useState<boolean>(false);
  const [selectedBgItem, setSelectedBgItem] = useState<BackgroundItem>(BACKGROUND_CATALOG[0]);
  const [bgCategory, setBgCategory] = useState<string>("all");
  const [bgSearch, setBgSearch] = useState<string>("");
  const [customHexColor, setCustomHexColor] = useState<string>("#ffffff");
  const studioFileInputRef = useRef<HTMLInputElement>(null);

  // Studio Session States (Persistent History)
  const [studioSessions, setStudioSessions] = useState<StudioSession[]>([]);
  const [activeStudioSessionId, setActiveStudioSessionId] = useState<string>("");
  const [selectedStudioCategory, setSelectedStudioCategory] = useState<StudioCategory>("all");
  const [studioSessionSearch, setStudioSessionSearch] = useState<string>("");
  const [editingStudioSessionId, setEditingStudioSessionId] = useState<string | null>(null);
  const [editingStudioTitle, setEditingStudioTitle] = useState<string>("");
  const [categoryMenuStudioSessionId, setCategoryMenuStudioSessionId] = useState<string | null>(null);
  const isInitialStudioLoadRef = useRef(true);

  function saveStudioSessionsToStorage(updatedSessions: StudioSession[]) {
    try {
      localStorage.setItem(STUDIO_SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (e) {
      console.warn("Storage quota exceeded, trimming old studio sessions:", e);
      try {
        const trimmed = updatedSessions.slice(0, 15);
        localStorage.setItem(STUDIO_SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));
      } catch {}
    }
  }

  // Load studio sessions from LocalStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STUDIO_SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: StudioSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudioSessions(parsed);
          const first = parsed[0];
          setActiveStudioSessionId(first.id);
          if (first.previewUrl) setStudioPreviewUrl(first.previewUrl);
          if (first.resultUrl) setStudioResultUrl(first.resultUrl);
          if (first.cutoutDataUrl) {
            fetch(first.cutoutDataUrl)
              .then((r) => r.blob())
              .then((b) => setStudioCutoutBlob(b))
              .catch(() => {});
          }
          if (first.selectedBgId) {
            const bg = BACKGROUND_CATALOG.find((b) => b.id === first.selectedBgId);
            if (bg) setSelectedBgItem(bg);
          }
          if (first.customHexColor) setCustomHexColor(first.customHexColor);
          isInitialStudioLoadRef.current = false;
          return;
        }
      }
    } catch (e) {
      console.error("Error loading studio sessions:", e);
    }
    const defaultStudioSession = createNewStudioSession("product", locale === "en");
    setStudioSessions([defaultStudioSession]);
    setActiveStudioSessionId(defaultStudioSession.id);
    isInitialStudioLoadRef.current = false;
  }, []);

  const filteredStudioSessions = useMemo(() => {
    return studioSessions.filter((s) => {
      const matchesCat = selectedStudioCategory === "all" || s.category === selectedStudioCategory;
      if (!matchesCat) return false;
      if (!studioSessionSearch.trim()) return true;
      const q = studioSessionSearch.toLowerCase();
      return s.title.toLowerCase().includes(q);
    });
  }, [studioSessions, selectedStudioCategory, studioSessionSearch]);

  const filteredBackgrounds = useMemo(() => {
    return BACKGROUND_CATALOG.filter((item) => {
      const matchesCategory = bgCategory === "all" || item.category === bgCategory;
      if (!matchesCategory) return false;
      if (!bgSearch.trim()) return true;
      const query = bgSearch.toLowerCase().trim();
      return (
        item.nameId.toLowerCase().includes(query) ||
        item.nameEn.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [bgCategory, bgSearch]);

  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageRendering, setImageRendering] = useState<boolean>(false);
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

  async function handleSelectStudioSession(targetId: string) {
    if (targetId === activeStudioSessionId) {
      setMobileSidebarOpen(false);
      return;
    }
    const target = studioSessions.find((s) => s.id === targetId);
    if (!target) return;

    setActiveStudioSessionId(targetId);
    setStudioFile(null);
    setStudioPreviewUrl(target.previewUrl || "");
    setStudioResultUrl(target.resultUrl || "");
    setStudioError("");

    if (target.selectedBgId) {
      const bg = BACKGROUND_CATALOG.find((b) => b.id === target.selectedBgId);
      if (bg) setSelectedBgItem(bg);
    }
    if (target.customHexColor) setCustomHexColor(target.customHexColor);

    if (target.cutoutDataUrl) {
      try {
        const res = await fetch(target.cutoutDataUrl);
        const blob = await res.blob();
        setStudioCutoutBlob(blob);
      } catch {
        setStudioCutoutBlob(null);
      }
    } else {
      setStudioCutoutBlob(null);
    }
    setMobileSidebarOpen(false);
  }

  function handleCreateNewStudioSession(category: StudioCategory = "product") {
    const newSession = createNewStudioSession(
      category === "all" ? "product" : category,
      isEnglish
    );
    const updated = [newSession, ...studioSessions];
    setStudioSessions(updated);
    setActiveStudioSessionId(newSession.id);
    saveStudioSessionsToStorage(updated);

    // Reset workspace
    setStudioFile(null);
    setStudioPreviewUrl("");
    setStudioResultUrl("");
    setStudioCutoutBlob(null);
    setSelectedBgItem(BACKGROUND_CATALOG[0]);
    setStudioError("");
    setMobileSidebarOpen(false);
  }

  function handleDeleteStudioSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = studioSessions.filter((s) => s.id !== id);
    if (updated.length === 0) {
      const fresh = createNewStudioSession("product", isEnglish);
      setStudioSessions([fresh]);
      setActiveStudioSessionId(fresh.id);
      saveStudioSessionsToStorage([fresh]);
      setStudioFile(null);
      setStudioPreviewUrl("");
      setStudioResultUrl("");
      setStudioCutoutBlob(null);
      setSelectedBgItem(BACKGROUND_CATALOG[0]);
    } else {
      setStudioSessions(updated);
      saveStudioSessionsToStorage(updated);
      if (id === activeStudioSessionId) {
        handleSelectStudioSession(updated[0].id);
      }
    }
  }

  function handleSaveRenameStudio(id: string) {
    if (!editingStudioTitle.trim()) {
      setEditingStudioSessionId(null);
      return;
    }
    const updated = studioSessions.map((s) =>
      s.id === id ? { ...s, title: editingStudioTitle.trim(), updatedAt: Date.now() } : s
    );
    setStudioSessions(updated);
    saveStudioSessionsToStorage(updated);
    setEditingStudioSessionId(null);
  }

  function handleChangeStudioCategory(id: string, newCat: StudioSession["category"], e: React.MouseEvent) {
    e.stopPropagation();
    const updated = studioSessions.map((s) =>
      s.id === id ? { ...s, category: newCat, updatedAt: Date.now() } : s
    );
    setStudioSessions(updated);
    saveStudioSessionsToStorage(updated);
    setCategoryMenuStudioSessionId(null);
  }

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

          const cleanUrl = await removeWatermarkFromImageUrl(statusData.imageUrl);
          setImageUrl(cleanUrl);
          setImageRendering(true);
          setStatus(ui.rendering);

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

  // Remove watermark by cleanly cropping off the bottom 26px logo bar
  async function removeWatermarkFromImageUrl(url: string): Promise<string> {
    if (!url || !url.startsWith("http")) return url;

    return new Promise((resolve) => {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const cropH = Math.max(h - 26, 100);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = cropH;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              resolve(url);
              return;
            }
            ctx.drawImage(img, 0, 0, w, cropH, 0, 0, w, cropH);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(URL.createObjectURL(blob));
                } else {
                  resolve(url);
                }
              },
              "image/png"
            );
          } catch {
            resolve(url);
          }
        };
        img.onerror = () => resolve(url);
        img.src = url;
      } catch {
        resolve(url);
      }
    });
  }

  async function handleStudioFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStudioError(isEnglish ? "Please select a valid image file." : "Silakan pilih file gambar yang valid.");
      return;
    }

    setStudioError("");
    setStudioFile(file);
    setStudioCutoutBlob(null);
    setStudioResultUrl("");
    const url = URL.createObjectURL(file);
    setStudioPreviewUrl(url);

    // Save compressed data URL to active studio session
    try {
      const dataUrl = await compressImageForStorage(file, 900);
      let autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      if (autoTitle) {
        autoTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
      } else {
        autoTitle = isEnglish ? "Uploaded Photo" : "Foto Unggahan";
      }

      setStudioSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === activeStudioSessionId) {
            const defaultTitles = ["Hapus Background Baru", "New Cutout"];
            const newTitle = defaultTitles.includes(s.title) ? autoTitle : s.title;
            return {
              ...s,
              title: newTitle,
              previewUrl: dataUrl,
              resultUrl: "",
              cutoutDataUrl: "",
              hasResult: false,
              updatedAt: Date.now(),
            };
          }
          return s;
        });
        saveStudioSessionsToStorage(updated);
        return updated;
      });
    } catch (err) {
      console.warn("Gagal menyimpan preview sesi:", err);
    }
  }

  // Pre-scale image to 1440px max PNG to keep WASM neural segmentation fast and light on RAM
  async function prepareImageForSegmentation(input: File | Blob | string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const processImg = (src: string) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const maxDimension = 1440;
            let width = img.naturalWidth || img.width || 1024;
            let height = img.naturalHeight || img.height || 1024;

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
              if (typeof input !== "string") resolve(input);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else if (typeof input !== "string") resolve(input);
              else reject(new Error("Canvas blob error"));
            }, "image/png");
          };
          img.onerror = () => {
            if (typeof input !== "string") resolve(input);
            else reject(new Error("Failed to load image"));
          };
          img.src = src;
        };

        if (typeof input === "string") {
          processImg(input);
        } else {
          const reader = new FileReader();
          reader.onload = (e) => processImg(e.target?.result as string);
          reader.onerror = () => resolve(input);
          reader.readAsDataURL(input);
        }
      } catch {
        if (typeof input !== "string") resolve(input);
        else reject(new Error("Failed to prepare image"));
      }
    });
  }

  // Composite transparent cutout onto selected background (color, gradient, or image)
  async function applyBackgroundToCutout(cutoutBlob: Blob, bgItem: BackgroundItem): Promise<Blob> {
    if (bgItem.type === "transparent") {
      return cutoutBlob;
    }

    return new Promise((resolve) => {
      const cutoutImg = new window.Image();
      const cutoutUrl = URL.createObjectURL(cutoutBlob);

      const cleanup = () => {
        try {
          URL.revokeObjectURL(cutoutUrl);
        } catch {}
      };

      cutoutImg.onload = () => {
        const canvas = document.createElement("canvas");
        const w = cutoutImg.naturalWidth || cutoutImg.width || 1024;
        const h = cutoutImg.naturalHeight || cutoutImg.height || 1024;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(cutoutBlob);
          return;
        }

        if (bgItem.type === "color") {
          ctx.fillStyle = bgItem.value || "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(cutoutImg, 0, 0, w, h);
          cleanup();
          canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
        } else if (bgItem.type === "gradient") {
          const grad = ctx.createLinearGradient(0, 0, w, h);
          if (bgItem.stops && bgItem.stops.length > 0) {
            bgItem.stops.forEach((s) => grad.addColorStop(s.offset, s.color));
          } else {
            grad.addColorStop(0, "#4f46e5");
            grad.addColorStop(1, "#ec4899");
          }
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(cutoutImg, 0, 0, w, h);
          cleanup();
          canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
        } else if (bgItem.type === "image" && bgItem.url) {
          const bgImg = new window.Image();
          bgImg.crossOrigin = "anonymous";
          bgImg.onload = () => {
            try {
              const bgW = bgImg.naturalWidth || bgImg.width || w;
              const bgH = bgImg.naturalHeight || bgImg.height || h;
              const scale = Math.max(w / bgW, h / bgH);
              const drawW = bgW * scale;
              const drawH = bgH * scale;
              const drawX = (w - drawW) / 2;
              const drawY = (h - drawH) / 2;

              ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
              ctx.drawImage(cutoutImg, 0, 0, w, h);
              cleanup();
              canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
            } catch (err) {
              console.warn("Canvas export fallback:", err);
              ctx.fillStyle = bgItem.fallbackColor || "#334155";
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(cutoutImg, 0, 0, w, h);
              cleanup();
              canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
            }
          };
          bgImg.onerror = () => {
            ctx.fillStyle = bgItem.fallbackColor || "#334155";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(cutoutImg, 0, 0, w, h);
            cleanup();
            canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
          };
          bgImg.src = bgItem.url;
        } else {
          ctx.drawImage(cutoutImg, 0, 0, w, h);
          cleanup();
          canvas.toBlob((blob) => resolve(blob || cutoutBlob), "image/png");
        }
      };

      cutoutImg.onerror = () => {
        cleanup();
        resolve(cutoutBlob);
      };

      cutoutImg.src = cutoutUrl;
    });
  }

  // Instant 0ms background switching when cutout is already available
  async function handleSelectBackground(bgItem: BackgroundItem) {
    setSelectedBgItem(bgItem);
    if (studioCutoutBlob) {
      try {
        setStudioLoading(true);
        setStudioProgress(
          isEnglish
            ? `Applying ${bgItem.nameEn} background...`
            : `Menerapkan latar ${bgItem.nameId}...`
        );
        let composited: Blob = studioCutoutBlob;
        if (bgItem.type === "transparent") {
          setStudioResultUrl(URL.createObjectURL(studioCutoutBlob));
        } else {
          composited = await applyBackgroundToCutout(studioCutoutBlob, bgItem);
          setStudioResultUrl(URL.createObjectURL(composited));
        }

        // Persist updated result to active studio session
        try {
          const resultDataUrl = await compressImageForStorage(composited, 900);
          setStudioSessions((prev) => {
            const updated = prev.map((s) => {
              if (s.id === activeStudioSessionId) {
                return {
                  ...s,
                  resultUrl: resultDataUrl,
                  selectedBgId: bgItem.id,
                  updatedAt: Date.now(),
                };
              }
              return s;
            });
            saveStudioSessionsToStorage(updated);
            return updated;
          });
        } catch {}
      } catch (err) {
        console.warn("Gagal mengubah background:", err);
      } finally {
        setStudioLoading(false);
        setStudioProgress("");
      }
    }
  }

  // Custom color picker handler
  async function handleCustomColorChange(hex: string) {
    setCustomHexColor(hex);
    const customItem: BackgroundItem = {
      id: `custom_${hex}`,
      nameId: `Kustom (${hex.toUpperCase()})`,
      nameEn: `Custom (${hex.toUpperCase()})`,
      category: "colors",
      type: "color",
      value: hex,
      cssBackground: hex,
    };
    await handleSelectBackground(customItem);
  }

  // Fallback edge & color isolation for devices that cannot execute WASM models
  async function fallbackBackgroundRemoval(fileOrBlobOrUrl: File | Blob | string, bgColor: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = typeof fileOrBlobOrUrl === "string" ? fileOrBlobOrUrl : URL.createObjectURL(fileOrBlobOrUrl);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = Math.min(img.naturalWidth || img.width, 1280);
          const h = Math.round((img.naturalHeight / (img.naturalWidth || 1)) * w);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            if (typeof fileOrBlobOrUrl !== "string") URL.revokeObjectURL(url);
            reject(new Error("No canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;

          const cornerIdxs = [0, (w - 1) * 4, ((h - 1) * w) * 4, ((h - 1) * w + (w - 1)) * 4];
          let bgR = 0, bgG = 0, bgB = 0;
          for (const idx of cornerIdxs) {
            bgR += d[idx];
            bgG += d[idx + 1];
            bgB += d[idx + 2];
          }
          bgR = Math.round(bgR / 4);
          bgG = Math.round(bgG / 4);
          bgB = Math.round(bgB / 4);

          const threshold = 38;
          for (let i = 0; i < d.length; i += 4) {
            const diff = Math.sqrt(
              Math.pow(d[i] - bgR, 2) +
              Math.pow(d[i + 1] - bgG, 2) +
              Math.pow(d[i + 2] - bgB, 2)
            );
            if (diff < threshold) {
              d[i + 3] = 0;
            } else if (diff < threshold + 15) {
              d[i + 3] = Math.round(((diff - threshold) / 15) * 255);
            }
          }
          ctx.putImageData(imgData, 0, 0);

          if (bgColor && bgColor !== "transparent") {
            const outCanvas = document.createElement("canvas");
            outCanvas.width = w;
            outCanvas.height = h;
            const outCtx = outCanvas.getContext("2d");
            if (outCtx) {
              outCtx.fillStyle = bgColor;
              outCtx.fillRect(0, 0, w, h);
              outCtx.drawImage(canvas, 0, 0);
              if (typeof fileOrBlobOrUrl !== "string") URL.revokeObjectURL(url);
              outCanvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("Blob error"));
              }, "image/png");
              return;
            }
          }

          if (typeof fileOrBlobOrUrl !== "string") URL.revokeObjectURL(url);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Blob error"));
          }, "image/png");
        } catch (e) {
          if (typeof fileOrBlobOrUrl !== "string") URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = (e) => {
        if (typeof fileOrBlobOrUrl !== "string") URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  async function handleStudioProcess() {
    const imageSource = studioFile || studioPreviewUrl;
    if (!imageSource) {
      setStudioError(isEnglish ? "Please upload a photo first." : "Unggah foto terlebih dahulu.");
      return;
    }

    setStudioLoading(true);
    setStudioError("");
    setStudioProgress("");

    try {
      setStudioProgress(
        isEnglish ? "Preparing image for AI analysis..." : "Menyiapkan gambar untuk analisis AI..."
      );

      const preparedBlob = await prepareImageForSegmentation(imageSource);

      setStudioProgress(
        isEnglish ? "Loading neural segmentation engine..." : "Memuat model AI neural segmentasi..."
      );

      // Dynamic import to keep bundle fast and prevent SSR evaluation
      const imgly = await import("@imgly/background-removal");
      const removeFn = (imgly.removeBackground || (imgly as any).default) as (
        image: any,
        config?: any
      ) => Promise<Blob>;

      const cutoutBlob = await removeFn(preparedBlob, {
        model: "isnet_quint8",
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.min(99, Math.round((current / total) * 100));
            setStudioProgress(
              isEnglish
                ? `AI isolating subject (${pct}%)...`
                : `AI sedang mengisolasi objek (${pct}%)...`
            );
          }
        },
      });

      setStudioCutoutBlob(cutoutBlob);

      let finalBlob = cutoutBlob;
      if (selectedBgItem && selectedBgItem.type !== "transparent") {
        const composited = await applyBackgroundToCutout(cutoutBlob, selectedBgItem);
        finalBlob = composited;
        setStudioResultUrl(URL.createObjectURL(composited));
      } else {
        setStudioResultUrl(URL.createObjectURL(cutoutBlob));
      }

      // Persist to active studio session
      try {
        const [cutoutDataUrl, resultDataUrl] = await Promise.all([
          blobToDataUrl(cutoutBlob),
          compressImageForStorage(finalBlob, 900),
        ]);

        setStudioSessions((prev) => {
          const updated = prev.map((s) => {
            if (s.id === activeStudioSessionId) {
              const bgLabel = isEnglish ? selectedBgItem.nameEn : selectedBgItem.nameId;
              let title = s.title;
              const defaultTitles = ["Hapus Background Baru", "New Cutout", "Uploaded Photo", "Foto Unggahan"];
              if (defaultTitles.includes(title)) {
                title = `Foto (${bgLabel})`;
              }
              return {
                ...s,
                title,
                cutoutDataUrl,
                resultUrl: resultDataUrl,
                selectedBgId: selectedBgItem.id,
                hasResult: true,
                updatedAt: Date.now(),
              };
            }
            return s;
          });
          saveStudioSessionsToStorage(updated);
          return updated;
        });
      } catch (saveErr) {
        console.warn("Gagal persist hasil studio:", saveErr);
      }

      // Simpan riwayat di background secara senyap
      fetch("/api/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove-bg" }),
      }).catch(() => {});

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI Design - Background Selesai! ✨",
          body: isEnglish
            ? "Your background removal is complete! Tap to view."
            : "Background foto kamu berhasil dihapus! Ketuk untuk melihat hasilnya.",
          url: "/ai-design?tab=remove-bg",
          tag: "dna-ai-studio-done",
        }).catch(() => {});
      }
    } catch (neuralErr: any) {
      console.warn("Neural removal fallback engaged:", neuralErr);
      try {
        setStudioProgress(
          isEnglish ? "Applying edge isolation..." : "Menerapkan segmentasi visual tepi..."
        );
        const fallbackColor = selectedBgItem.value || selectedBgItem.fallbackColor || "#ffffff";
        const fallbackBlob = await fallbackBackgroundRemoval(imageSource, fallbackColor);
        setStudioCutoutBlob(fallbackBlob);
        setStudioResultUrl(URL.createObjectURL(fallbackBlob));

        // Persist fallback result
        try {
          const [cutoutDataUrl, resultDataUrl] = await Promise.all([
            blobToDataUrl(fallbackBlob),
            compressImageForStorage(fallbackBlob, 900),
          ]);
          setStudioSessions((prev) => {
            const updated = prev.map((s) => {
              if (s.id === activeStudioSessionId) {
                return {
                  ...s,
                  cutoutDataUrl,
                  resultUrl: resultDataUrl,
                  selectedBgId: selectedBgItem.id,
                  hasResult: true,
                  updatedAt: Date.now(),
                };
              }
              return s;
            });
            saveStudioSessionsToStorage(updated);
            return updated;
          });
        } catch {}
      } catch {
        setStudioError(
          isEnglish
            ? "Failed to remove background. Please try another clear photo."
            : "Gagal menghapus background. Silakan coba foto lain dengan kontras yang jelas."
        );
      }
    } finally {
      setStudioLoading(false);
      setStudioProgress("");
    }
  }

  async function downloadStudioImage() {
    if (!studioResultUrl) return;
    try {
      const a = document.createElement("a");
      a.href = studioResultUrl;
      a.download = `dna-ai-${activeMainTab}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(studioResultUrl, "_blank");
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

  const renderStudioSidebarContent = () => (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-pink-400" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {isEnglish ? "Cutout Sessions" : "Daftar Hapus Background"}
          </span>
          <span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-semibold text-pink-400 border border-pink-500/20">
            {studioSessions.length}
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

      {/* + SESI BARU BUTTON */}
      <button
        type="button"
        onClick={() => handleCreateNewStudioSession(selectedStudioCategory === "all" ? "product" : selectedStudioCategory)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus size={16} />
        <span>{isEnglish ? "+ New Cutout" : "+ Sesi Baru"}</span>
      </button>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={studioSessionSearch}
          onChange={(e) => setStudioSessionSearch(e.target.value)}
          placeholder={isEnglish ? "Search cutouts..." : "Cari hasil..."}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-8 pr-7 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-pink-500/50"
        />
        {studioSessionSearch && (
          <button
            type="button"
            onClick={() => setStudioSessionSearch("")}
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
          {STUDIO_CATEGORIES.map((cat) => {
            const isActive = selectedStudioCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedStudioCategory(cat.id)}
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

      {/* SESSIONS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {filteredStudioSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <p>{isEnglish ? "No cutouts found in this folder." : "Belum ada hasil di folder ini."}</p>
            <button
              type="button"
              onClick={() => handleCreateNewStudioSession(selectedStudioCategory === "all" ? "product" : selectedStudioCategory)}
              className="mt-2 text-pink-400 hover:underline"
            >
              {isEnglish ? "+ New Cutout" : "+ Buat sesi baru"}
            </button>
          </div>
        ) : (
          filteredStudioSessions.map((session) => {
            const isActive = session.id === activeStudioSessionId;
            const isEditing = editingStudioSessionId === session.id;
            const bgItem = BACKGROUND_CATALOG.find((b) => b.id === session.selectedBgId);
            const icon = bgItem ? getBackgroundIcon(bgItem) : "✂️";

            return (
              <div
                key={session.id}
                onClick={() => handleSelectStudioSession(session.id)}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer border ${
                  isActive
                    ? "bg-pink-500/10 border-pink-500/40 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                    : "bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {session.resultUrl || session.previewUrl ? (
                    <img
                      src={session.resultUrl || session.previewUrl}
                      alt="Thumbnail"
                      className="h-8 w-8 rounded-lg object-contain bg-slate-900 border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 shrink-0">
                      <Layers size={14} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingStudioTitle}
                          onChange={(e) => setEditingStudioTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRenameStudio(session.id);
                            if (e.key === "Escape") setEditingStudioSessionId(null);
                          }}
                          autoFocus
                          className="w-full rounded border border-pink-500 bg-slate-950 px-1.5 py-0.5 text-xs text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameStudio(session.id)}
                          className="rounded p-1 text-green-400 hover:bg-green-500/20"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStudioSessionId(null)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate font-medium text-slate-200 group-hover:text-white">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span>{icon}</span>
                          <span>
                            {session.hasResult
                              ? (bgItem ? (isEnglish ? bgItem.nameEn : bgItem.nameId) : (isEnglish ? "Result Ready" : "Hasil Siap"))
                              : (isEnglish ? "Draft" : "Draf")}
                          </span>
                          <span>•</span>
                          <span>{formatTimeAgo(session.updatedAt, locale)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
                          setCategoryMenuStudioSessionId(
                            categoryMenuStudioSessionId === session.id ? null : session.id
                          )
                        }
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-pink-300 transition"
                        title={isEnglish ? "Move to folder" : "Pindah folder"}
                      >
                        <Folder size={12} />
                      </button>

                      {categoryMenuStudioSessionId === session.id && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur">
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                            {isEnglish ? "Select Folder" : "Pilih Folder"}
                          </div>
                          {STUDIO_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={(e) => handleChangeStudioCategory(session.id, cat.id as any, e)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStudioSessionId(session.id);
                        setEditingStudioTitle(session.title);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition"
                      title={isEnglish ? "Rename" : "Ubah nama"}
                    >
                      <Edit3 size={12} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteStudioSession(session.id, e)}
                      className="rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition"
                      title={isEnglish ? "Delete" : "Hapus sesi"}
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
                  {activeMainTab === "remove-bg"
                    ? isEnglish
                      ? "1-Click instant transparent PNG background remover with crystal clarity."
                      : "Hapus background foto 1-klik menjadi PNG transparan dengan resolusi tajam."
                    : ui.headerDescription}
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
                title={
                  sidebarOpen
                    ? (isEnglish ? "Hide History" : "Sembunyikan Daftar")
                    : (isEnglish ? "Show History" : "Daftar Hasil")
                }
              >
                <PanelLeft size={18} />
                <span className="hidden sm:inline">
                  {activeMainTab === "remove-bg"
                    ? (isEnglish ? "Cutouts" : "Daftar Hasil")
                    : (isEnglish ? "Designs" : "Daftar Desain")}
                </span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  {activeMainTab === "remove-bg" ? studioSessions.length : sessions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeMainTab === "remove-bg") {
                    handleCreateNewStudioSession();
                  } else {
                    handleCreateNewDesign();
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-purple-700 shadow-lg transition hover:bg-white/90 active:scale-95"
                title={
                  activeMainTab === "remove-bg"
                    ? (isEnglish ? "New Cutout" : "+ Sesi Baru")
                    : (isEnglish ? "New Design" : "+ Desain Baru")}
              >
                <Plus size={18} />
                <span>
                  {activeMainTab === "remove-bg"
                    ? (isEnglish ? "+ New Cutout" : "+ Sesi Baru")
                    : (isEnglish ? "+ New Design" : "+ Desain Baru")}
                </span>
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

        {/* MODE TABS (DESIGN / REMOVE-BG) */}
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => setActiveMainTab("design")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition ${
              activeMainTab === "design"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Palette size={16} />
            <span>{isEnglish ? "Graphic & Poster Design" : "Desain Grafis & Poster"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMainTab("remove-bg");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition ${
              activeMainTab === "remove-bg"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/25"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Layers size={16} />
            <span>{isEnglish ? "Remove Background" : "Hapus Background"}</span>
            <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-300 border border-pink-500/30">
              1-Click
            </span>
          </button>
        </div>

        {/* MAIN LAYOUT: SIDEBAR + GENERATOR */}
        {activeMainTab === "design" && (
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
          <div className="relative flex min-h-[500px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-4">
            {imageRendering && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 backdrop-blur-sm">
                <Loader2 size={36} className="animate-spin text-purple-400" />
                <p className="text-sm font-semibold text-white">
                  {isEnglish ? "Rendering Ultra-HD Visual..." : "Sedang Merender Visual Ultra-HD..."}
                </p>
                <p className="text-xs text-slate-400">
                  {isEnglish
                    ? "Detailing textures, lighting, and composition..."
                    : "Menyempurnakan tekstur, pencahayaan, dan komposisi 8K..."}
                </p>
              </div>
            )}

            {imageUrl ? (
              <img
                src={imageUrl}
                alt={ui.alt}
                onLoad={() => {
                  setImageRendering(false);
                  setStatus(ui.created);
                  setLoading(false);
                }}
                onError={() => {
                  setImageRendering(false);
                  setLoading(false);
                  setError(
                    isEnglish
                      ? "Failed to load generated image. Please click Generate again."
                      : "Gagal memuat visual gambar AI. Silakan coba tekan Generate lagi."
                  );
                }}
                className={`max-h-[900px] w-auto max-w-full rounded-lg object-contain transition-opacity duration-300 ${
                  imageRendering ? "opacity-0" : "opacity-100"
                }`}
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
        )}

        {/* STUDIO WORKSPACE (REMOVE-BG & PERSISTENT SESSIONS) */}
        {activeMainTab !== "design" && (
          <div className="relative flex gap-6 items-start">
            {/* DESKTOP SIDEBAR FOR STUDIO */}
            {sidebarOpen && (
              <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden min-h-[580px] max-h-[820px] transition-all duration-300">
                {renderStudioSidebarContent()}
              </aside>
            )}

            {/* MOBILE DRAWER FOR STUDIO */}
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-50 flex md:hidden bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <div
                  className="w-80 max-w-[85vw] h-full flex flex-col bg-slate-900 border-r border-slate-700 shadow-2xl animate-in slide-in-from-left duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderStudioSidebarContent()}
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column: Upload & Controls */}
            <div className="space-y-6 lg:col-span-5">
              {/* Box Upload Foto */}
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
                <h2 className="text-base font-semibold text-white">
                  {isEnglish ? "Upload Object / Product Photo" : "Unggah Foto Objek / Produk"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {isEnglish
                    ? "Supports JPG, PNG, WebP (Higher clarity produces better results)"
                    : "Format JPG, PNG, atau WebP (Foto yang jelas menghasilkan kualitas terbaik)"}
                </p>

                <input
                  ref={studioFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStudioFileChange}
                  className="hidden"
                />

                {!studioPreviewUrl ? (
                  <div
                    onClick={() => studioFileInputRef.current?.click()}
                    className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-8 transition hover:border-pink-500 hover:bg-slate-900/60"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500/10 text-pink-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-white">
                      {isEnglish ? "Click to upload photo" : "Klik untuk upload foto"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {isEnglish ? "or drag and drop here" : "atau drag & drop gambar ke sini"}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                      <NextImage
                        src={studioPreviewUrl}
                        alt="Preview Produk"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => studioFileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {isEnglish ? "Change Photo" : "Ganti Foto Lain"}
                    </button>
                  </div>
                )}
              </div>



              {/* Opsi Background 200+ Pilihan (Bunga, Alam, Studio, Gradien, Warna Solid, Abstrak, Interior) */}
              {activeMainTab === "remove-bg" && (
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
                  {/* Header & Status Terpilih */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-pink-400" />
                        {isEnglish ? "Background Catalog (200+ Choices)" : "Pilihan Background (200+ Variasi)"}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {isEnglish ? "Choose floral, nature, podium materials, gradients, or solid colors" : "Pilih bunga & flora, alam, podium marmer/kayu, gradien, atau warna"}
                      </p>
                    </div>

                    {/* Terpilih badge */}
                    <div className="inline-flex items-center gap-2 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3 py-1.5 text-xs font-semibold text-pink-200 shadow-sm">
                      <span className="text-base">{getBackgroundIcon(selectedBgItem)}</span>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] text-pink-300/80 uppercase tracking-wider font-bold">
                          {isEnglish ? "Selected Background" : "Latar Terpilih"}
                        </span>
                        <span className="truncate max-w-[140px] text-white">
                          {isEnglish ? selectedBgItem.nameEn : selectedBgItem.nameId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Search & Custom Color bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={bgSearch}
                        onChange={(e) => setBgSearch(e.target.value)}
                        placeholder={isEnglish ? "Search 200+ backgrounds (e.g. sakura, mawar, pantai, marmer)..." : "Cari 200+ background (misal: sakura, mawar, pantai, marmer)..."}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none transition"
                      />
                      {bgSearch && (
                        <button
                          type="button"
                          onClick={() => setBgSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Custom Color Input */}
                    <label
                      className="relative flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 transition"
                      title={isEnglish ? "Pick custom hex color" : "Pilih warna hex custom"}
                    >
                      <div
                        className="h-4 w-4 rounded-full border border-slate-600 shadow-sm"
                        style={{ backgroundColor: customHexColor }}
                      />
                      <span className="text-[11px] hidden sm:inline">{isEnglish ? "Custom" : "Kustom"}</span>
                      <input
                        type="color"
                        value={customHexColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>

                  {/* Category Pills */}
                  <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
                    {BACKGROUND_CATEGORIES.map((cat) => {
                      const isActive = bgCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setBgCategory(cat.id)}
                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                            isActive
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                              : "border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{isEnglish ? cat.nameEn : cat.nameId}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Scrollable Background Catalog Grid */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-0.5">
                      <span>
                        {isEnglish
                          ? `Showing ${filteredBackgrounds.length} presets`
                          : `Menampilkan ${filteredBackgrounds.length} pilihan`}
                      </span>
                      {selectedBgItem.id !== "transparent" && (
                        <button
                          type="button"
                          onClick={() => handleSelectBackground(BACKGROUND_CATALOG[0])}
                          className="text-pink-400 hover:text-pink-300 transition font-medium"
                        >
                          {isEnglish ? "Reset to Transparent" : "Reset ke Transparan"}
                        </button>
                      )}
                    </div>

                    <div className="grid max-h-[320px] grid-cols-4 sm:grid-cols-6 gap-2.5 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 scrollbar-thin scrollbar-thumb-slate-700">
                      {filteredBackgrounds.map((item) => {
                        const isSelected = selectedBgItem.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectBackground(item)}
                            title={isEnglish ? item.nameEn : item.nameId}
                            className={`group relative flex flex-col items-center rounded-xl p-1.5 text-center transition ${
                              isSelected
                                ? "bg-pink-500/20 ring-2 ring-pink-500 shadow-md shadow-pink-500/10"
                                : "border border-slate-800/80 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60"
                            }`}
                          >
                            {/* Preview Thumbnail with Real Photo & Logo */}
                            <div
                              className="relative h-16 w-full rounded-lg overflow-hidden border border-slate-700/60 shadow-inner bg-slate-900"
                              style={{
                                background: item.cssBackground || (item.value ? item.value : undefined),
                                backgroundColor: item.fallbackColor || undefined,
                              }}
                            >
                              {/* Real Image Preview */}
                              {item.type === "image" && item.url && (
                                <img
                                  src={getBackgroundThumbnail(item) || item.url}
                                  alt={item.nameId}
                                  loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                              )}

                              {/* Logo / Emoji Badge in bottom-left */}
                              <div className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/75 backdrop-blur-sm text-xs shadow-md border border-white/10">
                                <span>{getBackgroundIcon(item)}</span>
                              </div>

                              {item.type === "transparent" && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="rounded bg-black/75 px-1 py-0.5 text-[9px] font-bold text-white tracking-wider border border-white/10">
                                    PNG
                                  </span>
                                </div>
                              )}

                              {isSelected && (
                                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-white shadow ring-2 ring-white/50">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>

                            {/* Name Label */}
                            <span className={`mt-1.5 block w-full truncate text-[10px] leading-tight font-medium ${
                              isSelected ? "text-pink-300 font-bold" : "text-slate-300 group-hover:text-white"
                            }`}>
                              {isEnglish ? item.nameEn : item.nameId}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Eksekusi Hapus Background */}
              <button
                type="button"
                onClick={handleStudioProcess}
                disabled={studioLoading || !studioFile}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-4 font-semibold text-white shadow-lg shadow-purple-600/25 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {studioLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>
                      {studioProgress ||
                        (isEnglish
                          ? "Removing Background..."
                          : "Sedang Menghapus Background...")}
                    </span>
                  </>
                ) : (
                  <>
                    <Layers className="h-5 w-5" />
                    <span>
                      {isEnglish
                        ? "Remove Background Now"
                        : "Hapus Background Sekarang"}
                    </span>
                  </>
                )}
              </button>

              {studioError && (
                <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-200">
                  {studioError}
                </div>
              )}
            </div>

            {/* Right Column: Hasil Visual & Before/After */}
            <div className="lg:col-span-7">
              <div className="h-full rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-xl backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {isEnglish ? "Result Showcase" : "Hasil Visual"}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {isEnglish
                        ? "High-definition AI visual output with professional detail"
                        : "Preview hasil olahan AI dengan resolusi tajam dan jernih"}
                    </p>
                  </div>

                  {studioResultUrl && (
                    <div className="flex items-center gap-2">
                      {studioPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => setStudioShowCompare(!studioShowCompare)}
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            studioShowCompare
                              ? "border-pink-500 bg-pink-500/20 text-pink-300"
                              : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                          }`}
                        >
                          <SplitSquareVertical className="h-3.5 w-3.5" />
                          {studioShowCompare
                            ? isEnglish
                              ? "Result Only"
                              : "Lihat Hasil Saja"
                            : isEnglish
                            ? "Compare Before/After"
                            : "Bandingkan (Before/After)"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={downloadStudioImage}
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
                  {studioLoading ? (
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
                      <p className="text-sm font-medium text-white">
                        {studioProgress ||
                          (isEnglish
                            ? "Isolating Background..."
                            : "Sedang Mengisolasi Objek...")}
                      </p>
                      <p className="max-w-xs text-xs text-slate-400">
                        {isEnglish
                          ? "Neural network is separating foreground subject with pixel precision."
                          : "Neural network sedang memisahkan objek latar depan dengan presisi piksel tinggi."}
                      </p>
                    </div>
                  ) : studioResultUrl ? (
                    studioShowCompare && studioPreviewUrl ? (
                      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col items-center">
                          <span className="mb-2 text-xs font-medium text-slate-400">
                            {isEnglish ? "Original (Before)" : "Foto Asli (Before)"}
                          </span>
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-800">
                            <NextImage src={studioPreviewUrl} alt="Before" fill className="object-contain" unoptimized />
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="mb-2 text-xs font-medium text-pink-400">
                            {isEnglish ? "AI Processed (After)" : "Hasil AI (After)"}
                          </span>
                          <div
                            className={`relative aspect-square w-full overflow-hidden rounded-xl border border-pink-500/40 ${
                              selectedBgItem.type === "transparent" ? "bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:16px_16px] bg-slate-950" : "bg-slate-950"
                            }`}
                          >
                            <NextImage src={studioResultUrl} alt="After" fill className="object-contain" unoptimized />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative aspect-square max-h-[520px] w-full overflow-hidden rounded-xl border border-slate-800 ${
                          selectedBgItem.type === "transparent" ? "bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:16px_16px] bg-slate-950" : "bg-slate-950"
                        }`}
                      >
                        <NextImage
                          src={studioResultUrl}
                          alt="Hasil AI"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )
                  ) : selectedBgItem.id !== "transparent" ? (
                    <div className="relative flex aspect-square max-h-[520px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-pink-500/30 p-6 text-center">
                      {/* Background Visual Showcase */}
                      {selectedBgItem.type === "image" && selectedBgItem.url ? (
                        <img
                          src={selectedBgItem.url}
                          alt={selectedBgItem.nameId}
                          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: selectedBgItem.cssBackground || selectedBgItem.value,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />

                      {/* Content Card over Background Showcase */}
                      <div className="relative z-10 flex flex-col items-center gap-3 max-w-sm rounded-2xl border border-white/20 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-md">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/20 text-2xl border border-pink-500/40 shadow-inner">
                          {getBackgroundIcon(selectedBgItem)}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                            {isEnglish ? "Active Background Preview" : "Pratinjau Latar Terpilih"}
                          </span>
                          <h3 className="text-base font-bold text-white">
                            {isEnglish ? selectedBgItem.nameEn : selectedBgItem.nameId}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-300">
                          {studioFile
                            ? isEnglish
                              ? "Photo uploaded! Click the button below to isolate your subject and place it on this background."
                              : "Foto telah diunggah! Klik tombol di bawah untuk mengisolasi objek dan menempelkannya ke latar ini."
                            : isEnglish
                              ? "Upload your photo in the left panel to place your subject onto this background."
                              : "Unggah foto di panel kiri untuk langsung memasang objek Anda ke latar ini."}
                        </p>
                        {studioFile && (
                          <button
                            type="button"
                            onClick={handleStudioProcess}
                            disabled={studioLoading}
                            className="mt-1 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-500/25 transition hover:scale-105 active:scale-95"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {isEnglish ? "Apply to Photo Now" : "Terapkan ke Foto Sekarang"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center text-slate-500">
                      <Sparkles className="h-10 w-10 text-slate-700" />
                      <p className="text-sm font-medium">{isEnglish ? "No result yet" : "Belum ada hasil"}</p>
                      <p className="max-w-xs text-xs">
                        {isEnglish
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
    )}

      </div>
    </div>
  );
}

export default function AIDesignPage() {
  return (
    <Suspense fallback={null}>
      <AIDesignContent />
    </Suspense>
  );
}