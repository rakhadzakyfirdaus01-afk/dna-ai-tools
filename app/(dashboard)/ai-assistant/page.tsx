"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/shared/language-provider";
import {
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Camera,
  Link2,
  ChevronDown,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  Download,
  Code2,
  Globe,
  PanelLeft,
  PanelLeftClose,
  Trash2,
  Edit3,
  Search,
  Folder,
  MessageSquare,
  MoreVertical,
  Wand2,
  Gamepad2,
  Lightbulb,
  Languages,
  FileScan,
  Bug,
  Film,
  Palette,
  History,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { addNotification } from "@/components/notifications/notification-store";
import {
  requestNotificationPermission,
  sendBackgroundNotification,
} from "@/lib/push-notification";
import {
  speakNaturalVoice,
  stopNaturalVoice,
} from "@/lib/natural-voice";
import {
  VoiceModeOverlay,
  type VoiceModeStatus,
} from "@/components/voice/voice-mode-overlay";
import {
  compressImageFile,
  createThumbnailDataUrl,
} from "@/lib/image-compression";

import {
  AI_MODELS,
  AUTO_MODEL,
  DEFAULT_AI_MODEL,
  type AIModelId,
} from "@/lib/ai-models";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  fileName?: string;
  imagePreview?: string;
};

export type ChatCategory = "all" | "school" | "coding" | "casual" | "general";

export type ChatSession = {
  id: string;
  title: string;
  category: "school" | "coding" | "casual" | "general";
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export const CHAT_CATEGORIES: {
  id: ChatCategory;
  labelId: string;
  labelEn: string;
  icon: string;
  badgeColor: string;
}[] = [
  { id: "all", labelId: "Semua", labelEn: "All", icon: "💬", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "school", labelId: "Tugas / Kuliah", labelEn: "School / Study", icon: "🎓", badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { id: "coding", labelId: "Coding & Tech", labelEn: "Coding & Tech", icon: "💻", badgeColor: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  { id: "casual", labelId: "Obrolan Santai", labelEn: "Casual Chat", icon: "☕", badgeColor: "bg-pink-500/10 text-pink-300 border-pink-500/30" },
  { id: "general", labelId: "Umum", labelEn: "General", icon: "📁", badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
];

const SESSIONS_STORAGE_KEY = "dna_ai_assistant_sessions_v1";

function createNewSession(
  category: "school" | "coding" | "casual" | "general" = "general",
  isEn = false
): ChatSession {
  return {
    id: "session-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title: isEn ? "New Chat" : "Chat Baru",
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
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

type ModelOption = {
  id: AIModelId;
  name: string;
  description: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: AUTO_MODEL,
    name: "Auto (Rekomendasi)",
    description:
      "Otomatis beralih model jika kuota habis atau sibuk",
  },
  ...AI_MODELS.map((model) => ({
    id: model.id,
    name: model.name,
    description:
      "Model Gemini yang dikonfigurasi untuk AI Asisten",
  })),
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}
function formatResetTime(resetAt: string) {
  const date = new Date(resetAt);

  if (Number.isNaN(date.getTime())) {
    return "waktu reset tidak diketahui";
  }

  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
}

function buildConversationContext(messages: Message[]) {
  const recentMessages = messages.slice(-20);

  const lines = recentMessages.map((message) => {
    const role =
      message.role === "user"
        ? "User"
        : "Assistant";

    const attachment =
      message.fileName
        ? ` [Lampiran: ${message.fileName}]`
        : "";

    return `${role}${attachment}: ${message.content}`;
  });

  const context = lines.join("\n\n");

  if (context.length <= 12000) {
    return context;
  }

  return context.slice(-12000);
}

export default function Page() {
  const { locale } = useLanguage();
  const isEnglish = locale === "en";
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlOpen, setImageUrlOpen] = useState(false);

  const [selectedModel, setSelectedModel] =
    useState<AIModelId>(DEFAULT_AI_MODEL);
  const [modelMenuOpen, setModelMenuOpen] =
    useState(false);
  const [toolMenuOpen, setToolMenuOpen] =
    useState(false);
  const [webSearchEnabled, setWebSearchEnabled] =
    useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const checkMobileOrTablet = () => {
      if (typeof window === "undefined") return;
      const ua = navigator.userAgent || "";
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(ua);
      const isSmallScreen = window.innerWidth < 1024;
      const isTouch = navigator.maxTouchPoints > 0;
      setIsMobileOrTablet(isMobileUA || (isTouch && isSmallScreen) || isSmallScreen);
    };
    checkMobileOrTablet();
    window.addEventListener("resize", checkMobileOrTablet);
    return () => window.removeEventListener("resize", checkMobileOrTablet);
  }, []);

  // Multi-Chat & Folder Sessions States
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<ChatCategory>("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [categoryMenuSessionId, setCategoryMenuSessionId] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // 1. Inisialisasi daftar chat dari LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          isInitialLoadRef.current = false;
          return;
        }
      }
    } catch (e) {
      console.error("Error loading chat sessions:", e);
    }
    const defaultSession = createNewSession("general", locale === "en");
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    setMessages([]);
    isInitialLoadRef.current = false;
  }, []);

  // 2. Sinkronkan perubahan pesan ke session yang aktif dan LocalStorage
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSessionId) return;

    setSessions((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        if (s.id === activeSessionId) {
          let newTitle = s.title;
          const defaultTitles = ["Chat Baru", "New Chat"];
          if (defaultTitles.includes(s.title) && messages.length > 0) {
            const firstUserMsg = messages.find((m) => m.role === "user");
            if (firstUserMsg && firstUserMsg.content) {
              const clean = firstUserMsg.content.replace(/[\n\r]/g, " ").trim();
              newTitle = clean.slice(0, 32).trim() + (clean.length > 32 ? "..." : "");
            }
          }
          changed = true;
          return {
            ...s,
            title: newTitle,
            messages,
            updatedAt: Date.now(),
          };
        }
        return s;
      });

      if (changed) {
        try {
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, [messages, activeSessionId]);

  function handleSelectSession(targetId: string) {
    if (targetId === activeSessionId) {
      setMobileSidebarOpen(false);
      return;
    }
    const target = sessions.find((s) => s.id === targetId);
    if (!target) return;
    stopAiSpeaking();
    setActiveSessionId(targetId);
    setMessages(target.messages || []);
    setInput("");
    setFile(null);
    setImageUrl("");
    setMobileSidebarOpen(false);
  }

  function handleCreateNewChat(category?: "school" | "coding" | "casual" | "general") {
    stopAiSpeaking();
    const cat = category || (selectedCategory === "all" ? "general" : selectedCategory);
    const fresh = createNewSession(cat, isEnglish);
    setSessions((prev) => {
      const next = [fresh, ...prev];
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveSessionId(fresh.id);
    setMessages([]);
    setInput("");
    setFile(null);
    setImageUrl("");
    setMobileSidebarOpen(false);
  }

  function handleDeleteSession(targetId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    stopAiSpeaking();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== targetId);
      if (remaining.length === 0) {
        const fresh = createNewSession("general", isEnglish);
        remaining.push(fresh);
        setActiveSessionId(fresh.id);
        setMessages([]);
      } else if (activeSessionId === targetId) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages || []);
      }
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });
  }

  function handleStartRename(session: ChatSession, e?: React.MouseEvent) {
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
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setEditingSessionId(null);
  }

  function handleChangeCategory(targetId: string, newCat: "school" | "coding" | "casual" | "general", e?: React.MouseEvent) {
    e?.stopPropagation();
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === targetId ? { ...s, category: newCat } : s));
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCategoryMenuSessionId(null);
  }

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeCategoryMeta = CHAT_CATEGORIES.find((c) => c.id === currentSession?.category) || CHAT_CATEGORIES[4];

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch =
        !sessionSearch.trim() ||
        s.title.toLowerCase().includes(sessionSearch.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [sessions, selectedCategory, sessionSearch]);

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] =
    useState(false);
  const [isInstalled, setIsInstalled] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef =
    useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ChatGPT-Style Voice Mode States
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [voiceModeStatus, setVoiceModeStatus] =
    useState<VoiceModeStatus>("idle");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [latestVoiceReply, setLatestVoiceReply] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isVoicePausedRef = useRef(false);
  const voiceOverlayOpenRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef(0);
  const recordingStartTimeRef = useRef(0);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);
  const audioChunksRef =
    useRef<Blob[]>([]);
  const audioPlayerRef =
    useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    voiceOverlayOpenRef.current = voiceOverlayOpen;
  }, [voiceOverlayOpen]);

  useEffect(() => {
    isVoicePausedRef.current = isVoicePaused;
  }, [isVoicePaused]);

  const ui = {
    title: isEnglish ? "AI Assistant" : "AI Asisten",
    subtitle: isEnglish
      ? "One AI for all your needs"
      : "Satu AI untuk berbagai kebutuhanmu",
    camera: isEnglish ? "Camera" : "Kamera",
    cameraDescription: isEnglish
      ? "Take a photo to send to AI Assistant"
      : "Ambil foto untuk dikirim ke AI Asisten",
    cancel: isEnglish ? "Cancel" : "Batal",
    takePhoto: isEnglish ? "Take photo" : "Ambil foto",
    upload: isEnglish ? "Attach" : "Lampirkan",
    photoLink: isEnglish ? "Photo Link" : "Link Foto",
    cameraDesktopNote: isEnglish
      ? "Desktop only sends image URLs. File upload and camera are available on mobile."
      : "Desktop hanya mengirim URL gambar. Upload file dan kamera tersedia di HP.",
    placeholder: isEnglish ? "Ask anything..." : "Tanyakan apa saja...",
    heroTitle: isEnglish ? "How can I help?" : "Apa yang bisa saya bantu?",
    heroDescription: isEnglish
      ? "Ask anything. AI Assistant can help with programming, image prompts, documents, text recognition from images, and translation."
      : "Tanyakan apa saja. AI Asisten dapat membantu pemrograman, membuat prompt gambar, mengolah dokumen, membaca teks dari gambar, dan menerjemahkan bahasa.",
    techTitle: "🤖 AI Tech Assistant",
    techDescription: isEnglish
      ? "Debug code and solve technology problems."
      : "Debug kode dan bantu masalah teknologi.",
    imagePromptTitle: "🖼️ Image Prompt",
    imagePromptDescription: isEnglish
      ? "Create image prompts to match your needs."
      : "Buat prompt gambar sesuai kebutuhan.",
    documentTitle: isEnglish ? "📄 AI Document" : "📄 Dokumen AI",
    documentDescription: isEnglish
      ? "Analyze and work with various documents."
      : "Analisis dan olah berbagai dokumen.",
    ocrTranslatorTitle: isEnglish
      ? "🔎 Text Recognition & 🌐 Translator"
      : "🔎 Pengenal Teks & 🌐 Penerjemah",
    ocrTranslatorDescription: isEnglish
      ? "Read text from images and translate it."
      : "Baca teks dari gambar dan terjemahkan.",
    speaking: isEnglish ? "AI is speaking..." : "AI sedang berbicara...",
    attach: isEnglish ? "Attach" : "Lampirkan",
    askAnything: isEnglish ? "Ask anything..." : "Tanyakan apa saja...",
    aiNoAnswer: isEnglish ? "AI did not provide an answer." : "AI tidak memberikan jawaban.",
    sendPhoto: isEnglish ? "Sending photo..." : "Mengirim foto...",
    sentPhotoAlt: isEnglish ? "Sent photo" : "Foto yang dikirim",
    startRecording: isEnglish ? "Start recording" : "Mulai rekaman",
    stopRecording: isEnglish ? "Stop recording" : "Hentikan rekaman",
    voiceMessage: isEnglish ? "🎤 Voice message" : "🎤 Pesan suara",
    voiceProcessingError: isEnglish
      ? "Failed to process voice."
      : "Gagal memproses suara.",
    aiNoVoice: isEnglish
      ? "AI did not generate audio."
      : "AI tidak menghasilkan suara.",
    aiSpeakingStatus: isEnglish
      ? "🔊 AI is speaking..."
      : "🔊 AI sedang berbicara...",
    voiceFinishedTitle: isEnglish ? "AI Voice finished" : "AI Voice selesai",
    voiceFinishedMessage: isEnglish
      ? "The AI answer was successfully generated and played."
      : "Jawaban AI berhasil dibuat dan diputar.",
    voiceAudioFailed: isEnglish
      ? "⚠️ AI voice could not be played."
      : "⚠️ Suara AI gagal diputar.",
    voiceBlocked: isEnglish
      ? "⚠️ AI voice was blocked by the browser. Tap the screen and try again."
      : "⚠️ Suara AI diblokir browser. Coba ketuk layar lalu ulangi.",
    voiceGeneralError: isEnglish
      ? "Failed to process AI voice."
      : "Gagal memproses suara AI.",
    aiFinishedTitle: isEnglish ? "AI Assistant finished" : "AI Asisten selesai",
    aiFinishedMessage: isEnglish
      ? "The request was processed successfully and the AI answer is available."
      : "Permintaan berhasil diproses dan jawaban AI sudah tersedia.",
    aiGeneralError: isEnglish
      ? "An error occurred while processing the request."
      : "Terjadi kesalahan saat memproses permintaan.",
    cameraUnsupported: isEnglish
      ? "This browser does not support camera access."
      : "Browser ini tidak mendukung akses kamera.",
    micUnsupported: isEnglish
      ? "This browser does not support microphone access."
      : "Browser ini tidak mendukung mikrofon.",
    micDenied: isEnglish
      ? "Microphone access is blocked by Windows or your browser. Please check Windows Settings (Privacy & security > Microphone: ON) and click the lock/settings icon next to the URL to Allow microphone."
      : "Akses mikrofon diblokir oleh sistem Windows atau browser. Silakan aktifkan izin mikrofon di Pengaturan Windows (Privasi & keamanan > Mikrofon: ON) serta klik ikon gembok/setelan di samping URL browser lalu pilih Izinkan (Allow).",
    micNotFound: isEnglish
      ? "No microphone found on this device. Please connect a microphone and try again."
      : "Mikrofon tidak ditemukan pada perangkat ini. Sambungkan mikrofon lalu coba lagi.",
    micBusy: isEnglish
      ? "The microphone is currently in use by another app (e.g. Discord, Zoom, Game). Please close the other app and try again."
      : "Mikrofon sedang digunakan oleh aplikasi lain (seperti Discord, Zoom, atau Game). Silakan tutup aplikasi tersebut lalu coba lagi.",
    cameraDenied: isEnglish
      ? "Camera permission was denied. Allow camera access for this site and try again."
      : "Izin kamera ditolak. Izinkan kamera untuk situs ini lalu coba lagi.",
    cameraNotFound: isEnglish
      ? "No camera was found on this device."
      : "Kamera tidak ditemukan pada perangkat ini.",
    cameraBusy: isEnglish
      ? "The camera is being used by another application."
      : "Kamera sedang digunakan aplikasi lain.",
    cameraSecurity: isEnglish
      ? "Camera access is blocked by the browser or security settings."
      : "Akses kamera diblokir oleh browser atau pengaturan keamanan.",
    cameraGeneric: isEnglish
      ? "Could not access the camera."
      : "Tidak dapat mengakses kamera.",
    quotaMessage: isEnglish
      ? "⚠️ AI usage limit is currently reached.\\n\\nPlease try again after"
      : "⚠️ Batas penggunaan AI sedang tercapai.\n\nSilakan coba lagi setelah",
    voiceFeature: isEnglish ? "AI Assistant" : "AI Asisten",
    tools: isEnglish ? "Tools" : "Fitur",
    cameraTool: isEnglish ? "Camera" : "Kamera",
    attachTool: isEnglish ? "Attach" : "Lampirkan",
    designTool: isEnglish ? "AI Design" : "Desain AI",
    animationTool: isEnglish ? "AI Animation" : "Animasi AI",
    installApp: isEnglish
      ? "Install DNA AI"
      : "Install DNA AI",
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(display-mode: standalone)"
    );

    const checkInstalled = () => {
      const standalone =
        mediaQuery.matches ||
        (
          window.navigator as Navigator & {
            standalone?: boolean;
          }
        ).standalone === true;

      setIsInstalled(standalone);

      if (standalone) {
        setCanInstall(false);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      const installEvent =
        event as BeforeInstallPromptEvent;

      setInstallPrompt(installEvent);

      if (!mediaQuery.matches) {
        setCanInstall(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setInstallPrompt(null);
    };

    checkInstalled();

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    mediaQuery.addEventListener(
      "change",
      checkInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );

      mediaQuery.removeEventListener(
        "change",
        checkInstalled
      );
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();

    const result =
      await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstallPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    }
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type.startsWith("image/")) {
      try {
        const optimized = await compressImageFile(selectedFile);
        setFile(optimized);
        return;
      } catch {
        setFile(selectedFile);
        return;
      }
    }

    setFile(selectedFile);
  }

  function removeFile() {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function openCamera() {
    try {
      setCameraLoading(true);

      if (
        typeof window === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error(
          ui.cameraUnsupported
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error(
        "CAMERA ERROR:",
        error
      );

      const errorName =
        error instanceof DOMException
          ? error.name
          : "";

      let message =
        error instanceof Error
          ? error.message
          : ui.cameraGeneric;

      if (errorName === "NotAllowedError") {
        message =
          ui.cameraDenied;
      } else if (errorName === "NotFoundError") {
        message =
          ui.cameraNotFound;
      } else if (errorName === "NotReadableError") {
        message =
          ui.cameraBusy;
      } else if (errorName === "SecurityError") {
        message =
          ui.cameraSecurity;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `⚠️ ${message}`,
        },
      ]);
    } finally {
      setCameraLoading(false);
    }
  }

  function closeCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    const canvas =
      document.createElement("canvas");

    canvas.width =
      video.videoWidth || 1280;

    canvas.height =
      video.videoHeight || 720;

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const photo = new File(
          [blob],
          `kamera-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        setFile(photo);

        closeCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }

    const video = videoRef.current;
    const stream = cameraStreamRef.current;

    if (!video || !stream) {
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    const startVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error(
          "VIDEO PLAY ERROR:",
          error
        );
      }
    };

    startVideo();

    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        cameraStreamRef.current = null;
      }
    };
  }, []);

  function cleanupAudioVisualizer() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVoiceLevel(0);
  }

  function stopAiSpeaking() {
    const player = audioPlayerRef.current;

    if (player) {
      player.pause();
      player.currentTime = 0;
      audioPlayerRef.current = null;
    }

    stopNaturalVoice();
    setIsSpeaking(false);
  }

  function speakWithNaturalEngine(text: string) {
    if (voiceOverlayOpenRef.current) {
      setVoiceModeStatus("speaking");
    }

    speakNaturalVoice({
      text,
      locale: locale === "en" ? "en" : "id",
      onStart: () => {
        setIsSpeaking(true);
        if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("speaking");
        }
      },
      onEnd: () => {
        setIsSpeaking(false);
        if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
          // Percakapan terus-menerus tanpa henti ala ChatGPT
          setTimeout(() => {
            if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
              void startVoiceRecording();
            }
          }, 350);
        } else if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("idle");
        }
      },
      onError: () => {
        setIsSpeaking(false);
        if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
          setTimeout(() => {
            if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
              void startVoiceRecording();
            }
          }, 400);
        } else if (voiceOverlayOpenRef.current) {
          setVoiceModeStatus("idle");
        }
      },
    });
  }

  function playAiVoice(base64Audio?: string | null, rawText?: string) {
    stopAiSpeaking();

    // 1. Coba putar audio WAV dari server jika tersedia
    if (base64Audio) {
      try {
        const audio = new Audio(
          `data:audio/wav;base64,${base64Audio}`
        );

        audio.volume = 1;

        audio.onplay = () => {
          setIsSpeaking(true);
          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("speaking");
          }
        };

        audio.onended = () => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
            setTimeout(() => {
              if (voiceOverlayOpenRef.current && !isVoicePausedRef.current) {
                void startVoiceRecording();
              }
            }, 350);
          } else if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (rawText) {
            speakWithNaturalEngine(rawText);
          }
        };

        audioPlayerRef.current = audio;

        void audio.play().catch(() => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
          if (rawText) {
            speakWithNaturalEngine(rawText);
          }
        });

        return;
      } catch {
        // Fallback ke Natural Voice Engine
      }
    }

    // 2. Gunakan Natural Voice Engine (100% Free & Alami)
    if (rawText) {
      speakWithNaturalEngine(rawText);
    }
  }

  async function startVoiceRecording() {
    if (loading || isRecordingRef.current) {
      return;
    }

    stopAiSpeaking();

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          ui.micUnsupported
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      // Hubungkan ke Web Audio API Analyser untuk gelembung dinamis & deteksi keheningan (silence detection)
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;

          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          hasSpokenRef.current = false;
          lastSpeechTimeRef.current = 0;
          recordingStartTimeRef.current = Date.now();

          const checkAudioActivity = () => {
            if (!isRecordingRef.current) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
            setVoiceLevel(normalizedLevel);

            const now = Date.now();
            const SILENCE_THRESHOLD = 12; // Level threshold suara
            const SILENCE_DURATION = 1500; // 1.5 detik keheningan = user selesai bicara
            const MIN_SPEECH_DURATION = 800; // Minimal 800ms bicara agar batuk/klik tidak sengaja auto-kirim

            if (average > SILENCE_THRESHOLD) {
              if (!hasSpokenRef.current && now - recordingStartTimeRef.current > 300) {
                hasSpokenRef.current = true;
              }
              lastSpeechTimeRef.current = now;
            } else if (hasSpokenRef.current && lastSpeechTimeRef.current > 0) {
              const silenceElapsed = now - lastSpeechTimeRef.current;
              const totalElapsed = now - recordingStartTimeRef.current;
              if (silenceElapsed >= SILENCE_DURATION && totalElapsed >= MIN_SPEECH_DURATION) {
                // Pengguna telah selesai berbicara! Otomatis kirim tanpa harus tekan kirim
                stopVoiceRecording();
                return;
              }
            }

            animFrameRef.current = requestAnimationFrame(checkAudioActivity);
          };

          animFrameRef.current = requestAnimationFrame(checkAudioActivity);
        }
      } catch (audioErr) {
        console.warn("AudioContext visualization not available:", audioErr);
      }

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const supportedMimeType =
        mimeTypes.find((type) =>
          MediaRecorder.isTypeSupported(type)
        ) ?? "";

      const recorder = supportedMimeType
        ? new MediaRecorder(
            stream,
            {
              mimeType:
                supportedMimeType,
            }
          )
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      recorder.onstop = async () => {
        cleanupAudioVisualizer();

        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        const mimeType =
          recorder.mimeType ||
          "audio/webm";

        const blob = new Blob(
          audioChunksRef.current,
          {
            type: mimeType,
          }
        );

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecording(false);
        isRecordingRef.current = false;

        if (!blob.size) {
          setLoading(false);
          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
          return;
        }

        const extension =
          mimeType.includes("ogg")
            ? "ogg"
            : mimeType.includes("mp4")
              ? "mp4"
              : "webm";

        const voiceFile = new File(
          [blob],
          `voice-${Date.now()}.${extension}`,
          {
            type: mimeType,
          }
        );

        await sendVoiceMessage(
          voiceFile
        );
      };

      mediaRecorderRef.current =
        recorder;

      recorder.start();

      setIsRecording(true);
      isRecordingRef.current = true;
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("listening");
      }
    } catch (error) {
      cleanupAudioVisualizer();
      console.error(
        "VOICE RECORDING ERROR:",
        error
      );

      setIsRecording(false);
      isRecordingRef.current = false;
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("idle");
      }

      const errorName =
        error instanceof DOMException
          ? error.name
          : "";

      const rawMsg =
        error instanceof Error
          ? error.message.toLowerCase()
          : "";

      let contentMsg =
        error instanceof Error
          ? `⚠️ ${error.message}`
          : "⚠️ Mikrofon tidak dapat digunakan.";

      if (
        errorName === "NotAllowedError" ||
        errorName === "PermissionDeniedError" ||
        rawMsg.includes("permission") ||
        rawMsg.includes("denied")
      ) {
        contentMsg = `⚠️ ${ui.micDenied}`;
      } else if (
        errorName === "NotFoundError" ||
        rawMsg.includes("not found")
      ) {
        contentMsg = `⚠️ ${ui.micNotFound}`;
      } else if (
        errorName === "NotReadableError" ||
        rawMsg.includes("busy") ||
        rawMsg.includes("in use")
      ) {
        contentMsg = `⚠️ ${ui.micBusy}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: contentMsg,
        },
      ]);
    }
  }

  function stopVoiceRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    if (recorder.state === "recording") {
      recorder.stop();
    }
  }

  function handleOpenVoiceMode() {
    setVoiceOverlayOpen(true);
    setIsVoicePaused(false);
    isVoicePausedRef.current = false;
    setVoiceModeStatus("listening");
    setLatestVoiceReply("");
    stopAiSpeaking();

    // Beri jeda sejenak untuk transisi UI lalu aktifkan mikrofon
    setTimeout(() => {
      void startVoiceRecording();
    }, 200);
  }

  function handleCloseVoiceMode() {
    setVoiceOverlayOpen(false);
    setIsVoicePaused(false);
    isVoicePausedRef.current = false;
    setVoiceModeStatus("idle");
    stopVoiceRecording();
    stopAiSpeaking();
    cleanupAudioVisualizer();
  }

  function handleTogglePauseVoice() {
    if (isVoicePaused) {
      setIsVoicePaused(false);
      isVoicePausedRef.current = false;
      setVoiceModeStatus("listening");
      void startVoiceRecording();
    } else {
      setIsVoicePaused(true);
      isVoicePausedRef.current = true;
      setVoiceModeStatus("paused");
      stopVoiceRecording();
      stopAiSpeaking();
      cleanupAudioVisualizer();
    }
  }

  function handleSendNowVoice() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      stopVoiceRecording();
    }
  }

  async function sendVoiceMessage(
    voiceFile: File
  ) {
    requestNotificationPermission().catch(() => {});
    setLoading(true);
    if (voiceOverlayOpenRef.current) {
      setVoiceModeStatus("thinking");
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: ui.voiceMessage,
      },
    ]);

    try {
      const formData =
        new FormData();

      const conversationContext =
        buildConversationContext(messages);

      formData.append(
        "message",
        ""
      );

      formData.append(
        "conversation",
        conversationContext
      );

      formData.append(
        "voice",
        voiceFile
      );

      formData.append(
        "model",
        selectedModel
      );

      formData.append(
        "locale",
        locale
      );

      formData.append(
        "webSearch",
        String(webSearchEnabled)
      );

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      let data: any = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        if (
          response.status === 413 ||
          rawText.toLowerCase().includes("too large") ||
          rawText.toLowerCase().includes("request entity")
        ) {
          throw new Error(
            ui.voiceProcessingError
          );
        }
        throw new Error(
          rawText.slice(0, 180) || ui.voiceProcessingError
        );
      }

      if (!response.ok) {
        if (
          response.status === 429 &&
          data?.quota?.exhausted
        ) {
          const retryAt =
            data.quota.retryAt;

          const retryText = retryAt
            ? formatResetTime(retryAt)
            : "beberapa saat lagi";

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "assistant",
              content:
                `⚠️ Batas penggunaan AI sedang tercapai.\n\n` +
                `Silakan coba lagi setelah ${retryText}.`,
            },
          ]);

          if (voiceOverlayOpenRef.current) {
            setVoiceModeStatus("idle");
          }
          return;
        }

        throw new Error(
          data.error ||
            ui.voiceProcessingError
        );
      }

      const aiReplyText =
        data.result || ui.aiNoAnswer;

      setLatestVoiceReply(aiReplyText);
      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("speaking");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: aiReplyText,
        },
      ]);

      playAiVoice(data.audio, aiReplyText);

      addNotification({
        feature:
          data.feature ||
          "AI Asisten",
        title:
          ui.voiceFinishedTitle,
        message:
          ui.voiceFinishedMessage,
        type: "success",
        result:
          data.result || "",
      });

      // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
      if (typeof document !== "undefined" && document.hidden) {
        const previewText =
          data.result && typeof data.result === "string"
            ? data.result.replace(/[#*`_]/g, "").slice(0, 100) + "..."
            : "Jawaban suara AI untuk tugas Anda sudah siap. Ketuk untuk membuka kembali.";

        sendBackgroundNotification({
          title: "DNA AI - Jawaban Suara Siap! 🎙️",
          body: previewText,
          url: "/ai-assistant",
          tag: "dna-ai-voice-done",
        }).catch(() => {});
      }
    } catch (error) {
      console.error(
        "AI VOICE ERROR:",
        error
      );

      if (voiceOverlayOpenRef.current) {
        setVoiceModeStatus("idle");
      }

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI - Pemberitahuan",
          body: "Terjadi kendala saat memproses pesan suara AI. Ketuk untuk memeriksa.",
          url: "/ai-assistant",
          tag: "dna-ai-voice-error",
        }).catch(() => {});
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : ui.voiceGeneralError,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      stopAiSpeaking();
      cleanupAudioVisualizer();

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function sendMessage() {
    const text = input.trim();

    const currentImageUrl = imageUrl.trim();

    if (!text && !file && !currentImageUrl) {
      return;
    }

    // Minta izin notifikasi HP agar siap mengirim pemberitahuan saat user buka aplikasi lain
    requestNotificationPermission().catch(() => {});

    const currentFile = file;

    const imagePreview =
      currentFile &&
      currentFile.type.startsWith("image/")
        ? URL.createObjectURL(currentFile)
        : undefined;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content:
        text || ui.sendPhoto,
      fileName:
        currentFile?.name ||
        (currentImageUrl
          ? currentImageUrl
          : undefined),
      imagePreview,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const formData =
        new FormData();

      const conversationContext =
        buildConversationContext([
          ...messages,
          userMessage,
        ]);

      formData.append(
        "message",
        text
      );

      formData.append(
        "conversation",
        conversationContext
      );

      let thumbnailDataUrl = "";
      if (currentFile) {
        let fileToSend = currentFile;
        if (currentFile.type.startsWith("image/")) {
          try {
            thumbnailDataUrl = await createThumbnailDataUrl(currentFile);
            fileToSend = await compressImageFile(currentFile);
          } catch {
            fileToSend = currentFile;
          }
        }
        formData.append(
          "file",
          fileToSend
        );
        if (thumbnailDataUrl) {
          formData.append(
            "imageThumbnail",
            thumbnailDataUrl
          );
        }
      }

      if (currentImageUrl) {
        formData.append(
          "imageUrl",
          currentImageUrl
        );
      }

      formData.append(
        "model",
        selectedModel
      );

      formData.append(
        "locale",
        locale
      );

      formData.append(
        "webSearch",
        String(webSearchEnabled)
      );

      const response =
        await fetch(
          "/api/ai-assistant",
          {
            method: "POST",
            body: formData,
          }
        );

      let data: any = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        if (
          response.status === 413 ||
          rawText.toLowerCase().includes("too large") ||
          rawText.toLowerCase().includes("request entity")
        ) {
          throw new Error(
            isEnglish
              ? "The uploaded file is too large for the server. DNA AI is automatically optimizing it, please try again."
              : "Ukuran file terlalu besar untuk diproses server. DNA AI mengoptimalkan gambar secara otomatis, silakan coba kirim lagi."
          );
        }
        if (!response.ok) {
          throw new Error(
            rawText.slice(0, 180) ||
              (isEnglish
                ? "Server responded with an error."
                : "Terjadi kesalahan respon dari server.")
          );
        }
      }

      if (!response.ok) {
        if (
          response.status === 429 &&
          data?.quota?.exhausted
        ) {
          const retryAt =
            data.quota.retryAt;

          const retryText = retryAt
            ? formatResetTime(retryAt)
            : "beberapa saat lagi";

          const quotaMessage: Message = {
            id: Date.now() + 1,
            role: "assistant",
            content:
              `⚠️ Batas penggunaan AI sedang tercapai.\n\n` +
              `Silakan coba lagi setelah ${retryText}.`,
          };

          setMessages((prev) => [
            ...prev,
            quotaMessage,
          ]);

          return;
        }

        throw new Error(
          data.error ||
            (isEnglish
              ? "An error occurred while contacting AI."
              : "Terjadi kesalahan saat menghubungi AI.")
        );
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          data.result ||
          ui.aiNoAnswer,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      if (typeof window !== "undefined" && data?.history?.id) {
        try {
          const historyChat = [
            {
              role: "user" as const,
              content: text || (isEnglish ? "Sent a photo" : "Foto yang dikirim"),
              image: thumbnailDataUrl || (currentFile && currentFile.type.startsWith("image/") ? imagePreview : undefined),
            },
            {
              role: "assistant" as const,
              content: data.result || ui.aiNoAnswer,
            },
          ];
          window.localStorage.setItem(
            `dna-ai-history-conversation:${data.history.id}`,
            JSON.stringify(historyChat)
          );
        } catch (storageErr) {
          console.warn("History localStorage cache warning:", storageErr);
        }
      }

      addNotification({
        feature:
          data.feature ||
          "AI Asisten",
        title:
          ui.aiFinishedTitle,
        message:
          ui.aiFinishedMessage,
        type: "success",
        result:
          data.result || "",
      });

      // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
      if (typeof document !== "undefined" && document.hidden) {
        const previewText =
          data.result && typeof data.result === "string"
            ? data.result.replace(/[#*`_]/g, "").slice(0, 100) + "..."
            : "Jawaban AI untuk tugas Anda sudah siap. Ketuk untuk melihat hasilnya.";

        sendBackgroundNotification({
          title: "DNA AI - Tugas Selesai! ✨",
          body: previewText,
          url: "/ai-assistant",
          tag: "dna-ai-task-done",
        }).catch(() => {});
      }

      setFile(null);
      setImageUrl("");
      setImageUrlOpen(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(
        "AI ASSISTANT ERROR:",
        error
      );

      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI - Pemberitahuan",
          body: "Terjadi kendala saat memproses jawaban AI. Ketuk untuk memeriksa.",
          url: "/ai-assistant",
          tag: "dna-ai-task-error",
        }).catch(() => {});
      }

      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : ui.aiGeneralError,
      };

      setMessages((prev) => [
        ...prev,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full p-3.5 space-y-3">
      {/* HEADER & NEW CHAT BUTTON */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <MessageSquare size={17} className="text-cyan-400" />
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-wide">
            {isEnglish ? "Chats & Folders" : "Daftar Obrolan"}
          </span>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
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

      {/* + CHAT BARU BUTTON */}
      <button
        type="button"
        onClick={() => handleCreateNewChat()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:opacity-90 active:scale-[0.98]"
      >
        <Plus size={16} />
        <span>{isEnglish ? "New Chat" : "+ Chat Baru"}</span>
      </button>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={sessionSearch}
          onChange={(e) => setSessionSearch(e.target.value)}
          placeholder={isEnglish ? "Search chats..." : "Cari obrolan..."}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-8 pr-7 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
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
          {CHAT_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                    : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{isEnglish ? cat.labelEn : cat.labelId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHATS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <p>{isEnglish ? "No chats found." : "Belum ada obrolan di folder ini."}</p>
            <button
              type="button"
              onClick={() => handleCreateNewChat(selectedCategory === "all" ? "general" : selectedCategory)}
              className="mt-2 text-cyan-400 hover:underline"
            >
              {isEnglish ? "+ Start a new chat" : "+ Mulai chat baru"}
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const catMeta = CHAT_CATEGORIES.find((c) => c.id === session.category) || CHAT_CATEGORIES[4];
            const isEditing = editingSessionId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer border ${
                  isActive
                    ? "bg-cyan-500/10 border-cyan-500/40 text-foreground shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/70 hover:text-foreground hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm shrink-0">{catMeta.icon}</span>

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
                        className="w-full rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white outline-none border border-cyan-500"
                      />
                      <button type="submit" className="text-cyan-400 hover:text-white">
                        <Check size={12} />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-5">
                        {session.title || (isEnglish ? "New Chat" : "Chat Baru")}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {session.messages?.length || 0} {isEnglish ? "messages" : "pesan"} • {formatTimeAgo(session.updatedAt, locale)}
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
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-cyan-300 transition"
                        title={isEnglish ? "Move to folder" : "Pindah folder"}
                      >
                        <Folder size={12} />
                      </button>

                      {categoryMenuSessionId === session.id && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur">
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                            {isEnglish ? "Select Folder" : "Pilih Folder"}
                          </div>
                          {CHAT_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
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
                      title={isEnglish ? "Delete" : "Hapus chat"}
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
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">

      {/* CAMERA MODAL */}

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">

            <div className="flex items-center justify-between border-b border-border px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">

                  <Camera
                    size={20}
                    className="text-white"
                  />

                </div>

                <div>

                  <h2 className="font-semibold text-foreground">
                    {ui.camera}
                  </h2>

                  <p className="text-xs text-muted-foreground">
                    {ui.cameraDescription}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeCamera}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>


            <div className="bg-black">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                disablePictureInPicture
                className="block min-h-[280px] max-h-[65vh] w-full object-contain"
              />

            </div>


            <div className="flex items-center justify-center gap-4 px-5 py-5">

              <button
                type="button"
                onClick={closeCamera}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {ui.cancel}
              </button>


              <button
                type="button"
                onClick={capturePhoto}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg transition hover:scale-105"
                aria-label={ui.takePhoto}
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-900">

                  <Camera size={22} />

                </div>

              </button>

            </div>

          </div>

        </div>
      )}


      {/* HEADER */}

      <div className="mb-6 flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center">
            <Image
              src="/logo-dna.png"
              alt="DNA AI"
              width={44}
              height={44}
              priority
              className="object-contain"
            />
          </div>

          <div>

            <h1 className="text-2xl font-bold text-foreground">
              {ui.title}
            </h1>

            <p className="text-sm text-muted-foreground">
              {ui.subtitle}
            </p>

          </div>

        </div>

      </div>


      {/* MAIN CONTAINER: SIDEBAR + CHAT AREA */}
      <div className="relative flex flex-1 gap-4 overflow-hidden min-h-[620px]">
        {/* DESKTOP SIDEBAR */}
        {sidebarOpen && (
          <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col rounded-3xl border border-border bg-card/95 backdrop-blur shadow-xl overflow-hidden transition-all duration-300">
            {renderSidebarContent()}
          </aside>
        )}

        {/* MOBILE DRAWER OVERLAY */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 flex md:hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <div
              className="w-80 max-w-[85vw] h-full flex flex-col bg-slate-950 border-r border-border shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* CHAT AREA */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl min-w-0">
          {/* TOP MINI BAR: Toggle Sidebar, Active Session Title, Folder Tag, New Chat */}
          <div className="flex items-center justify-between border-b border-border/60 bg-slate-950/40 px-4 py-2.5 backdrop-blur gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSidebarOpen((prev) => !prev);
                  setMobileSidebarOpen((prev) => !prev);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                title={sidebarOpen ? (isEnglish ? "Hide Chat List" : "Sembunyikan Obrolan") : (isEnglish ? "Show Chat List" : "Tampilkan Obrolan")}
                aria-label="Toggle Chat Sidebar"
              >
                <PanelLeft size={18} />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium border ${activeCategoryMeta.badgeColor}`}>
                  <span>{activeCategoryMeta.icon}</span>
                  <span className="hidden sm:inline">{isEnglish ? activeCategoryMeta.labelEn : activeCategoryMeta.labelId}</span>
                </span>

                {editingSessionId === activeSessionId ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveRename(activeSessionId);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(activeSessionId)}
                      autoFocus
                      className="rounded-lg border border-cyan-500/50 bg-slate-900 px-2 py-0.5 text-xs text-white outline-none"
                    />
                    <button type="submit" className="text-cyan-400 hover:text-white">
                      <Check size={14} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(currentSession, e)}
                    className="flex items-center gap-1.5 truncate text-left text-xs sm:text-sm font-semibold text-foreground hover:text-cyan-400 transition"
                    title={isEnglish ? "Click to rename chat" : "Klik untuk mengubah judul chat"}
                  >
                    <span className="truncate max-w-[130px] sm:max-w-xs">{currentSession?.title || (isEnglish ? "New Chat" : "Chat Baru")}</span>
                    <Edit3 size={12} className="opacity-40 hover:opacity-100 shrink-0" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCreateNewChat()}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 text-xs font-semibold text-white shadow transition hover:opacity-90 active:scale-95"
                title={isEnglish ? "New Chat" : "Chat Baru"}
              >
                <Plus size={15} />
                <span className="hidden sm:inline">{isEnglish ? "New Chat" : "Chat Baru"}</span>
              </button>
            </div>
          </div>

          {/* MESSAGES */}

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">

          {messages.length === 0 ? (

            <div className="flex min-h-[500px] items-center justify-center">

              <div className="max-w-2xl text-center">

                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
                  <Image
                    src="/logo-dna.png"
                    alt="DNA AI"
                    width={56}
                    height={56}
                    priority
                    className="object-contain"
                  />
                </div>


                <h2 className="text-3xl font-bold text-foreground">
                  {ui.heroTitle}
                </h2>


                <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                  {ui.heroDescription}
                </p>


                <div className="mt-8 hidden grid-cols-1 gap-3 md:grid md:grid-cols-2">

                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.techTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.techDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.imagePromptTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.imagePromptDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.documentTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.documentDescription}
                    </p>

                  </div>


                  <div className="rounded-2xl border border-border bg-secondary/70 p-4 text-left">

                    <p className="font-semibold text-foreground">
                      {ui.ocrTranslatorTitle}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {ui.ocrTranslatorDescription}
                    </p>

                  </div>

                </div>

              </div>

            </div>

          ) : (

            <div className="mx-auto max-w-4xl space-y-6">

              {messages.map(
                (message) => (

                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                          : "border border-border bg-secondary text-foreground"
                      }`}
                    >

                      {message.imagePreview && (
                        <div className="mb-3 overflow-hidden rounded-2xl">
                          <img
                            src={message.imagePreview}
                            alt={
                              message.fileName ||
                              ui.sentPhotoAlt
                            }
                            className="max-h-[420px] max-w-full rounded-2xl object-contain"
                          />
                        </div>
                      )}

                      {message.fileName && (

                        <div className="mb-3 flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm">

                          {message.fileName.match(
                            /\.(png|jpe?g|webp)$/i
                          ) ? (

                            <ImageIcon size={16} />

                          ) : (

                            <FileText size={16} />

                          )}

                          <span className="truncate">
                            {message.fileName}
                          </span>

                        </div>

                      )}


                      {message.role === "assistant" ? (
                        <div className="prose prose-invert max-w-none text-sm leading-7 break-words [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>h1]:font-bold [&>h2]:font-bold [&>h3]:font-semibold [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-2 [&>code]:bg-slate-800/80 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-cyan-300">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a
                                  {...props}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 underline decoration-cyan-500/40 hover:text-cyan-300 hover:decoration-cyan-400 font-medium inline-flex items-center gap-0.5 transition"
                                />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-7">
                          {message.content}
                        </div>
                      )}

                      {message.role === "assistant" && (
                        <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeaking) {
                                stopAiSpeaking();
                              } else {
                                playAiVoice(null, message.content);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-black/10 hover:text-cyan-400"
                            title={isSpeaking ? "Hentikan Suara" : "Dengarkan Suara Natural AI"}
                          >
                            <Volume2 size={13} className="text-cyan-400" />
                            <span>
                              {isSpeaking
                                ? isEnglish
                                  ? "Stop"
                                  : "Hentikan"
                                : isEnglish
                                ? "Listen"
                                : "Dengarkan suara"}
                            </span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>

                )
              )}


              {isSpeaking && (
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300">
                  <div className="flex items-center gap-2">
                    <Volume2 size={18} className="animate-pulse text-cyan-400" />
                    <span className="font-medium">{ui.speaking}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopAiSpeaking}
                    className="flex items-center gap-1 text-xs text-red-400 transition hover:underline"
                  >
                    <VolumeX size={14} />
                    <span>{isEnglish ? "Stop" : "Hentikan"}</span>
                  </button>
                </div>
              )}

              {loading && (

                <div className="flex justify-start">

                  <div className="rounded-3xl border border-border bg-secondary px-5 py-4">

                    <div className="flex items-center gap-2">

                      <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                        style={{
                          animationDelay:
                            "120ms",
                        }}
                      />

                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
                        style={{
                          animationDelay:
                            "240ms",
                        }}
                      />

                    </div>

                  </div>

                </div>

              )}

            </div>

          )}

        </div>


        {/* INPUT AREA */}

        <div className="border-t border-border bg-card p-4 lg:p-6">

          <div className="mx-auto max-w-4xl">

            {imageUrl.trim() && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-secondary px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Link2
                    size={18}
                    className="shrink-0 text-cyan-400"
                  />
                  <span className="truncate text-sm text-foreground">
                    {imageUrl}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageUrlOpen(false);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {file && (

              <div className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">

                <div className="flex min-w-0 items-center gap-3">

                  {file.type.startsWith("image/") ? (

                    <ImageIcon
                      size={18}
                      className="shrink-0 text-cyan-400"
                    />

                  ) : (

                    <FileText
                      size={18}
                      className="shrink-0 text-cyan-400"
                    />

                  )}

                  <span className="truncate text-sm text-foreground">
                    {file.name}
                  </span>

                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >

                  <X size={18} />

                </button>

              </div>

            )}

            <div className="rounded-3xl border border-border bg-input p-2 shadow-lg focus-within:border-cyan-500">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder={ui.placeholder}
                rows={3}
                disabled={loading}
                className="w-full resize-none bg-transparent px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />

              <div className="relative mb-2 px-2">
                <button
                  type="button"
                  onClick={() =>
                    setModelMenuOpen((prev) => !prev)
                  }
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-left transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground">
                      {
                        MODEL_OPTIONS.find(
                          (option) =>
                            option.id ===
                            selectedModel
                        )?.name ?? "Model"
                      }
                    </div>
                    <div className="hidden text-[11px] text-muted-foreground sm:block">
                      {
                        selectedModel === AUTO_MODEL
                          ? (isEnglish
                              ? "Auto fallback if quota is busy"
                              : "Fallback otomatis jika kuota habis")
                          : (isEnglish
                              ? "Gemini model for AI Assistant"
                              : "Model Gemini untuk AI Asisten")
                      }
                    </div>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-500 transition-transform ${
                      modelMenuOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {modelMenuOpen && (
                  <div className="absolute bottom-full left-2 z-50 mb-2 w-[310px] overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] p-2 shadow-2xl">
                    {MODEL_OPTIONS.map(
                      (option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedModel(
                              option.id
                            );
                            setModelMenuOpen(
                              false
                            );
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                            selectedModel === option.id
                              ? "bg-slate-800/80 border border-cyan-500/30"
                              : "hover:bg-slate-800"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                selectedModel === option.id ? "text-cyan-300" : "text-slate-200"
                              }`}>
                                {option.name}
                              </span>
                              {option.id === AUTO_MODEL && (
                                <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                  AUTO
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {option.id === AUTO_MODEL
                                ? (isEnglish
                                    ? "Automatically switch models if quota is exhausted or busy"
                                    : "Otomatis beralih model jika kuota habis atau sibuk")
                                : (isEnglish
                                    ? "Gemini model configured for AI Assistant"
                                    : "Model Gemini yang dikonfigurasi untuk AI Asisten")}
                            </p>
                          </div>

                          {selectedModel ===
                            option.id && (
                            <Check
                              size={17}
                              className="mt-0.5 shrink-0 text-cyan-400"
                            />
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-2 pb-1">

                <div className="relative">

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setToolMenuOpen((prev) => !prev)
                    }
                    disabled={loading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={ui.tools}
                    title={ui.tools}
                  >
                    <Plus
                      size={20}
                      className={`transition-transform ${
                        toolMenuOpen
                          ? "rotate-45"
                          : ""
                      }`}
                    />
                  </button>

                  {toolMenuOpen && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-[275px] sm:w-[290px] rounded-2xl border border-slate-700/80 bg-[#111827]/98 p-1.5 shadow-2xl backdrop-blur-md">
                      {/* 1. KAMERA (Khusus Mobile: HP / IP / Tablet) */}
                      {isMobileOrTablet && (
                        <button
                          type="button"
                          onClick={() => {
                            setToolMenuOpen(false);
                            openCamera();
                          }}
                          disabled={loading || cameraLoading}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                            <Camera size={18} className="text-cyan-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white">
                              {ui.cameraTool}
                            </div>
                            <p className="truncate text-xs text-slate-400">
                              {ui.cameraDescription}
                            </p>
                          </div>
                        </button>
                      )}

                      {/* 2. LAMPIRKAN FILE */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          fileInputRef.current?.click();
                        }}
                        disabled={loading}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                          <Paperclip size={18} className="text-slate-200" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white">
                            {ui.attachTool}
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "Upload file from device"
                              : "Unggah file dari perangkat"}
                          </p>
                        </div>
                      </button>


                      {/* 4. ARCADE GAME AI */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-arcade");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800/80 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20">
                          <Gamepad2 size={18} className="text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            Arcade Game AI
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "Play & remix games"
                              : "Main & remix game langsung"}
                          </p>
                        </div>
                      </button>

                      {/* 5. GALERI INSPIRASI */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/showcase");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800/80 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                          <Lightbulb size={18} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {isEnglish ? "Showcase Gallery" : "Galeri Inspirasi"}
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "1-click curated prompt presets"
                              : "Preset prompt siap pakai 1-klik"}
                          </p>
                        </div>
                      </button>

                      {/* 6. AI CODE */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-code");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                          <Code2 size={18} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            AI Code
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "Coding, web & game dev"
                              : "Coding, pembuatan web, dan game"}
                          </p>
                        </div>
                      </button>

                      {/* 7. DESAIN AI */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-design");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                          <Palette size={18} className="text-pink-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white group-hover:text-pink-300 transition-colors">
                            {ui.designTool}
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "Graphic design & remove background"
                              : "Desain grafis & hapus background"}
                          </p>
                        </div>
                      </button>

                      {/* 8. ANIMASI AI */}
                      <button
                        type="button"
                        onClick={() => {
                          setToolMenuOpen(false);
                          router.push("/ai-animation");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-800 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                          <Film size={18} className="text-purple-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {ui.animationTool}
                          </div>
                          <p className="truncate text-xs text-slate-400">
                            {isEnglish
                              ? "AI animation & video generator"
                              : "Video & animasi bergerak AI"}
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                </div>

                <button
                  type="button"
                  onClick={() => setWebSearchEnabled((prev) => !prev)}
                  disabled={loading}
                  className={`flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold transition ${
                    webSearchEnabled
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  aria-label={isEnglish ? "Web Search" : "Akses Web"}
                  title={
                    webSearchEnabled
                      ? isEnglish
                        ? "Web Search: ACTIVE (Live Grounding)"
                        : "Akses Web: AKTIF (Real-Time)"
                      : isEnglish
                      ? "Web Search: AUTO (Click to force)"
                      : "Akses Web: OTOMATIS (Klik untuk aktifkan)"
                  }
                >
                  <Globe
                    size={16}
                    className={webSearchEnabled ? "text-cyan-400 animate-spin" : ""}
                    style={webSearchEnabled ? { animationDuration: "12s" } : undefined}
                  />
                  <span className="hidden sm:inline">
                    {webSearchEnabled
                      ? isEnglish
                        ? "Web Active"
                        : "Web Aktif"
                      : "Web"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenVoiceMode}
                  disabled={loading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={isEnglish ? "Open Voice Mode" : "Buka Mode Suara"}
                  title={isEnglish ? "ChatGPT Voice Mode" : "Mode Suara ChatGPT"}
                >
                  <Mic size={18} />
                </button>

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    loading ||
                    (!input.trim() &&
                      !file &&
                      !imageUrl.trim())
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <Send size={18} />

                </button>

              </div>

            </div>

            <p className="mt-3 text-center text-xs text-slate-600">
              {isEnglish
                ? "AI Assistant can use different functions based on the needs of the conversation."
                : "AI Asisten dapat menggunakan beberapa fungsi berdasarkan kebutuhan percakapan."}
            </p>

          </div>

        </div>

      </div>

    </div>

      {/* ChatGPT-Style Voice Mode Overlay */}
      {voiceOverlayOpen && (
        <VoiceModeOverlay
          isOpen={voiceOverlayOpen}
          status={voiceModeStatus}
          voiceLevel={voiceLevel}
          isPaused={isVoicePaused}
          latestReply={latestVoiceReply}
          onClose={handleCloseVoiceMode}
          onTogglePause={handleTogglePauseVoice}
          onSendNow={handleSendNowVoice}
          onStopSpeaking={stopAiSpeaking}
          locale={locale === "en" ? "en" : "id"}
        />
      )}

    </div>
  );
}