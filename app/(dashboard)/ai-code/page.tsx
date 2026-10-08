"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Code2,
  Send,
  Loader2,
  Copy,
  Check,
  FileCode2,
  Terminal,
  Sparkles,
  Eye,
  FolderOpen,
  RefreshCw,
  Maximize2,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Save,
  Undo2,
  Globe,
  Wrench,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  PanelLeft,
  PanelLeftClose,
  Trash2,
  Edit3,
  Search,
  Folder,
  MessageSquare,
  Columns,
  Play,
  Zap,
} from "lucide-react";


import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-provider";

import { addNotification } from "@/components/notifications/notification-store";
import {
  requestNotificationPermission,
  sendBackgroundNotification,
} from "@/lib/push-notification";

import {
  buildPreviewHtml,
  getInitialPreviewFile,
  canPreviewProject,
  getPreviewFiles,
  type PreviewFile,
} from "@/lib/ai-code-preview";

type GeneratedFile = PreviewFile;

type GeneratedProject = {
  projectName: string;
  type: "web" | "game" | "software";
  description: string;
  files: GeneratedFile[];
};

export type CodeCategory = "all" | "web" | "software" | "fix" | "general";

export type CodeSession = {
  id: string;
  title: string;
  category: "web" | "software" | "fix" | "general";
  mode: "web" | "software" | "fix";
  createdAt: number;
  updatedAt: number;
  prompt: string;
  codeContext: string;
  fileName: string;
  project: GeneratedProject | null;
  previewProjectFiles: GeneratedFile[];
};

export const CODE_CATEGORIES: {
  id: CodeCategory;
  labelId: string;
  labelEn: string;
  icon: string;
  badgeColor: string;
}[] = [
  { id: "all", labelId: "Semua", labelEn: "All", icon: "💬", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
  { id: "web", labelId: "Web & UI", labelEn: "Web & UI", icon: "🌐", badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  { id: "software", labelId: "Software & Backend", labelEn: "Software & Backend", icon: "💻", badgeColor: "bg-blue-500/10 text-blue-300 border-blue-500/30" },
  { id: "fix", labelId: "Perbaiki Error", labelEn: "Fix Code", icon: "🛠️", badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  { id: "general", labelId: "Umum", labelEn: "General", icon: "📁", badgeColor: "bg-slate-800 text-slate-300 border-slate-700" },
];

const CODE_SESSIONS_STORAGE_KEY = "dna_ai_code_sessions_v1";

function createNewCodeSession(
  mode: "web" | "software" | "fix" = "web",
  category: "web" | "software" | "fix" | "general" = "web",
  isEn = false
): CodeSession {
  const defaultTitle =
    mode === "fix"
      ? (isEn ? "New Bug Fix" : "Perbaikan Kode Baru")
      : mode === "software"
      ? (isEn ? "New Software / Script" : "Program / Skrip Baru")
      : (isEn ? "New Web Project" : "Proyek Web Baru");


  return {
    id: "codesession-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    title: defaultTitle,
    category,
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    prompt: "",
    codeContext: "",
    fileName: "",
    project: null,
    previewProjectFiles: [],
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

type PreviewResponse = {
  available: boolean;
  files: GeneratedFile[];
};

type AICodeResponse = {
  success?: boolean;
  project?: GeneratedProject;
  preview?: PreviewResponse;
  result?: string;
  model?: string;
  feature?: string;
  outputType?: string;
  error?: string;
};

export default function AICodePage() {
  const { locale } = useLanguage();

  const isEnglish = locale === "en";

  // Codex Modes: web (Modern Web App), software (Software & Backend), fix (Perbaiki Kode)
  const [mode, setMode] = useState<"web" | "software" | "fix">("web");
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [builderTab, setBuilderTab] = useState<"preview" | "code" | "split">("preview");


  const [prompt, setPrompt] = useState("");
  const [codeContext, setCodeContext] = useState("");
  const [fileName, setFileName] = useState("");
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const isRegenerate = Boolean(project);
  const [previewProjectFiles, setPreviewProjectFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);

  // Multi-Project / Session States
  const [sessions, setSessions] = useState<CodeSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<CodeCategory>("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [categoryMenuSessionId, setCategoryMenuSessionId] = useState<string | null>(null);
  // Universal Multi-Platform App Exporter State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // 1. Inisialisasi daftar sesi project dari LocalStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CODE_SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed: CodeSession[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          const validMode = (parsed[0].mode === "fix" || parsed[0].mode === "software") ? parsed[0].mode : "web";
          setMode(validMode);
          setPrompt(parsed[0].prompt || "");
          setCodeContext(parsed[0].codeContext || "");
          setFileName(parsed[0].fileName || "");
          setProject(parsed[0].project || null);
          setPreviewProjectFiles(parsed[0].previewProjectFiles || []);
          isInitialLoadRef.current = false;
          return;
        }
      }
    } catch (e) {
      console.error("Error loading code sessions:", e);
    }
    const defaultSession = createNewCodeSession("web", "web", locale === "en");
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    isInitialLoadRef.current = false;
  }, []);

  // Cek apakah ada prompt remix dari Showcase Gallery
  useEffect(() => {
    try {
      const incomingPrompt =
        sessionStorage.getItem("ai_code_remix_prompt") ||
        sessionStorage.getItem("showcase_prompt");
      if (incomingPrompt) {
        setPrompt(incomingPrompt);
        const incomingCategory = sessionStorage.getItem("showcase_category") || "web";
        if (incomingCategory === "software" || incomingCategory === "fix") {
          setMode(incomingCategory);
          setSelectedCategory(incomingCategory);
        } else {
          setMode("web");
          setSelectedCategory("web");
        }
        sessionStorage.removeItem("ai_code_remix_prompt");
        sessionStorage.removeItem("showcase_prompt");
        sessionStorage.removeItem("showcase_category");
      }
    } catch {}
  }, []);

  // 2. Sinkronkan perubahan project/prompt/mode ke session yang aktif dan LocalStorage
  useEffect(() => {
    if (isInitialLoadRef.current || !activeSessionId) return;

    setSessions((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        if (s.id === activeSessionId) {
          let newTitle = s.title;
          const defaultTitles = [
            "Proyek Web Baru",
            "New Web Project",
            "Perbaikan Kode Baru",
            "New Bug Fix",
            "Program / Skrip Baru",
            "New Software / Script",
          ];
          if (defaultTitles.includes(s.title)) {
            if (project?.projectName) {
              newTitle = project.projectName;
            } else if (prompt.trim()) {
              newTitle = prompt.slice(0, 30).trim() + (prompt.length > 30 ? "..." : "");
            }
          }
          changed = true;
          return {
            ...s,
            title: newTitle,
            mode,
            prompt,
            codeContext,
            fileName,
            project,
            previewProjectFiles,
            updatedAt: Date.now(),
          };
        }
        return s;
      });

      if (changed) {
        try {
          localStorage.setItem(CODE_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }, [project, prompt, mode, codeContext, fileName, previewProjectFiles, activeSessionId]);

  function handleSelectSession(targetId: string) {
    if (targetId === activeSessionId) {
      setMobileSidebarOpen(false);
      return;
    }
    const target = sessions.find((s) => s.id === targetId);
    if (!target) return;
    setActiveSessionId(targetId);
    setMode(target.mode || "web");
    setPrompt(target.prompt || "");
    setCodeContext(target.codeContext || "");
    setFileName(target.fileName || "");
    setProject(target.project || null);
    setPreviewProjectFiles(target.previewProjectFiles || []);
    setSelectedFile(target.project?.files?.[0] || null);
    setError("");
    setMobileSidebarOpen(false);
  }

  function handleCreateNewProject(category?: "web" | "software" | "fix" | "general") {
    const targetMode = category === "fix" ? "fix" : category === "software" ? "software" : "web";
    const cat = category || (selectedCategory === "all" ? targetMode : selectedCategory);
    const fresh = createNewCodeSession(targetMode, cat, isEnglish);
    setSessions((prev) => {
      const next = [fresh, ...prev];
      try {
        localStorage.setItem(CODE_SESSIONS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveSessionId(fresh.id);
    setMode(targetMode);
    setPrompt("");
    setCodeContext("");
    setFileName("");
    setProject(null);
    setPreviewProjectFiles([]);
    setSelectedFile(null);
    setError("");
    setMobileSidebarOpen(false);
  }

  function handleDeleteSession(targetId: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== targetId);
      if (remaining.length === 0) {
        const fresh = createNewCodeSession("web", "web", isEnglish);
        remaining.push(fresh);
        setActiveSessionId(fresh.id);
        setMode("web");
        setPrompt("");
        setCodeContext("");
        setFileName("");
        setProject(null);
        setPreviewProjectFiles([]);
        setSelectedFile(null);
      } else if (activeSessionId === targetId) {
        const nextActive = remaining[0];
        setActiveSessionId(nextActive.id);
        setMode(nextActive.mode || "web");
        setPrompt(nextActive.prompt || "");
        setCodeContext(nextActive.codeContext || "");
        setFileName(nextActive.fileName || "");
        setProject(nextActive.project || null);
        setPreviewProjectFiles(nextActive.previewProjectFiles || []);
        setSelectedFile(nextActive.project?.files?.[0] || null);
      }
      try {
        localStorage.setItem(CODE_SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });
  }

  function handleStartRename(session: CodeSession, e?: React.MouseEvent) {
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
        localStorage.setItem(CODE_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setEditingSessionId(null);
  }

  function handleChangeCategory(targetId: string, newCat: "web" | "software" | "fix" | "general", e?: React.MouseEvent) {
    e?.stopPropagation();
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === targetId ? { ...s, category: newCat } : s));
      try {
        localStorage.setItem(CODE_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCategoryMenuSessionId(null);
  }

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeCategoryMeta = CODE_CATEGORIES.find((c) => c.id === currentSession?.category) || CODE_CATEGORIES[1];

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchSearch =
        !sessionSearch.trim() ||
        s.title.toLowerCase().includes(sessionSearch.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [sessions, selectedCategory, sessionSearch]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [previewKey, setPreviewKey] =
    useState(0);

  const [previewFullscreen, setPreviewFullscreen] =
    useState(false);

  // File editor
  const [isEditing, setIsEditing] =
    useState(false);

  const [editingContent, setEditingContent] =
    useState("");

  const [editorDirty, setEditorDirty] =
    useState(false);

  /**
   * File yang digunakan oleh Live Preview.
   *
   * Backend sekarang menyediakan:
   *
   * data.preview.files
   *
   * Jika response tersebut tidak tersedia,
   * frontend menggunakan project.files sebagai
   * fallback agar kompatibel dengan response lama.
   */
  const filesForPreview =
    previewProjectFiles.length > 0
      ? previewProjectFiles
      : project?.files ?? [];

  /**
   * HTML final untuk iframe.
   */
  const previewHtml = useMemo(() => {
    if (
      filesForPreview.length ===
      0
    ) {
      return "";
    }

    return buildPreviewHtml(
      filesForPreview
    );
  }, [filesForPreview]);

  /**
   * Apakah project mempunyai file HTML
   * yang dapat dipreview.
   */
  const hasPreview =
    filesForPreview.length > 0
      ? canPreviewProject(
          filesForPreview
        )
      : false;

  /**
   * File yang ditampilkan pada explorer.
   *
   * Untuk file explorer kita menggunakan
   * seluruh project, bukan hanya file preview.
   */
  const projectFiles = useMemo(() => {
    if (!project) {
      return [];
    }

    return project.files;
  }, [project]);

  /**
   * File yang benar-benar dapat diproses
   * oleh Live Preview.
   */
  const previewFiles = useMemo(() => {
    return getPreviewFiles(
      filesForPreview
    );
  }, [filesForPreview]);

  /**
   * Menutup fullscreen menggunakan tombol Escape.
   */
  useEffect(() => {
    if (!previewFullscreen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        setPreviewFullscreen(
          false
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    previewFullscreen,
  ]);

  /**
   * Generate project dari AI.
   */
  async function generateCode() {
    if (editorDirty) {
      setError(
        isEnglish
          ? "Please save or cancel your file changes before regenerating."
          : "Simpan atau batalkan perubahan file terlebih dahulu sebelum regenerate."
      );
      return;
    }

    if (!prompt.trim()) {
      setError(
        isEnglish
          ? "Please describe what you want to build."
          : "Jelaskan terlebih dahulu apa yang ingin kamu buat."
      );

      return;
    }

    const regenerateMode = Boolean(project);

    // Minta izin notifikasi HP agar siap mengirim pemberitahuan saat user buka aplikasi lain
    requestNotificationPermission().catch(() => {});

    setLoading(true);
    setError("");
    setCopied(false);

    // Saat regenerate, project lama tetap ditampilkan sampai
    // project baru berhasil diterima agar UI tidak kosong.
    if (!regenerateMode) {
      setProject(null);
      setPreviewProjectFiles([]);
      setSelectedFile(null);
      setPreviewKey(0);
    }

    try {
      const response =
        await fetch(
          "/api/ai-code",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              prompt:
                prompt.trim(),

              codeContext:
                codeContext,

              fileName:
                fileName,

              locale:
                locale === "en"
                  ? "en"
                  : "id",

              mode,

              // Jika project sudah ada, backend akan memakai
              // project tersebut sebagai source of truth dan
              // menerapkan prompt terbaru sebagai perubahan.
              existingProject:
                project ?? undefined,
            }),
          }
        );

      let data: AICodeResponse;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          isEnglish
            ? "The server returned an invalid response."
            : "Server mengembalikan response yang tidak valid."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "An error occurred while building the project."
              : "Terjadi kesalahan saat membangun project.")
        );
      }

      if (
        !data?.project ||
        typeof data.project !==
          "object"
      ) {
        throw new Error(
          isEnglish
            ? "AI did not return a valid project."
            : "AI tidak mengembalikan project yang valid."
        );
      }

      if (
        !Array.isArray(
          data.project.files
        )
      ) {
        throw new Error(
          isEnglish
            ? "The generated project has no valid files."
            : "Project hasil AI tidak memiliki file yang valid."
        );
      }

      const generatedProject =
        data.project;

      /**
       * Validasi dasar project.
       */
      const validProjectFiles =
        getPreviewFiles(
          generatedProject.files
        );

      if (
        validProjectFiles.length ===
        0
      ) {
        throw new Error(
          isEnglish
            ? "AI did not generate usable project files."
            : "AI tidak menghasilkan file project yang dapat digunakan."
        );
      }

      /**
       * Ambil file preview dari API.
       *
       * Jika backend menyediakan preview.files,
       * gunakan daftar tersebut.
       *
       * Jika tidak tersedia, gunakan file project.
       */
      const backendPreviewFiles =
        Array.isArray(
          data.preview?.files
        )
          ? getPreviewFiles(
              data.preview.files
            )
          : [];

      const validPreviewFiles =
        backendPreviewFiles.length >
        0
          ? backendPreviewFiles
          : validProjectFiles;

      /**
       * Normalisasi project sebelum disimpan
       * ke state frontend.
       */
      const normalizedProject: GeneratedProject =
        {
          projectName:
            typeof generatedProject.projectName ===
              "string" &&
            generatedProject.projectName.trim()
              ? generatedProject.projectName.trim()
              : "AI Project",

          type:
            generatedProject.type ===
              "web" ||
            generatedProject.type ===
              "game" ||
            generatedProject.type ===
              "software"
              ? generatedProject.type
              : "web",

          description:
            typeof generatedProject.description ===
              "string"
              ? generatedProject.description.trim()
              : "",

          files:
            validProjectFiles,
        };

      setProject(
        normalizedProject
      );

      setPreviewProjectFiles(
        validPreviewFiles
      );

      /**
       * Pilih index.html sebagai file awal.
       */
      const initialFile =
        getInitialPreviewFile(
          validProjectFiles
        );

      setSelectedFile(
        initialFile
      );

      /**
       * Memaksa iframe membuat
       * preview project terbaru.
       */
      setPreviewKey(
        (value) =>
          value + 1
      );

      // Automatically switch to Live Preview tab (v0 style)
      setBuilderTab("preview");


      /*
       * =========================================================
       * SIMPAN KE HISTORY
       * =========================================================
       *
       * History sekarang menyimpan project lengkap,
       * termasuk seluruh isi source code setiap file.
       *
       * Kegagalan history tidak boleh membuat project AI yang
       * sudah berhasil dibuat dianggap gagal.
       */

      let historyResult = "";

      try {
        historyResult = JSON.stringify({
          project:
            normalizedProject,

          mode:
            regenerateMode
              ? "regenerate"
              : "build",
        });

        await fetch(
          "/api/history",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              title:
                regenerateMode
                  ? "AI Code Project diperbarui"
                  : "AI Code Project dibuat",

              feature: "AI Code",

              prompt:
                prompt.trim(),

              result:
                historyResult,
            }),
          }
        );
      } catch (historyError) {
        console.warn(
          "Gagal menyimpan history AI Code:",
          historyError
        );
      }

      /*
       * =========================================================
       * NOTIFIKASI
       * =========================================================
       *
       * Notification memakai notification-store yang sudah
       * digunakan oleh Navbar. Karena store tersebut memiliki
       * subscription, badge notifikasi akan ikut diperbarui.
       */
      addNotification({
        feature: "AI Code",

        title: regenerateMode
          ? isEnglish
            ? "AI Code project updated"
            : "Project AI Code diperbarui"
          : isEnglish
          ? "AI Code project ready"
          : "Project AI Code selesai",

        message: isEnglish
          ? `${normalizedProject.projectName} is ready with ${normalizedProject.files.length} file${normalizedProject.files.length === 1 ? "" : "s"}.`
          : `${normalizedProject.projectName} berhasil ${regenerateMode ? "diperbarui" : "dibuat"} dengan ${normalizedProject.files.length} file.`,

        type: "success",

        result: historyResult,
      });

      // Kirim notifikasi HP jika pengguna sedang membuka game atau aplikasi lain
      if (typeof document !== "undefined" && document.hidden) {
        const notifTitle =
          mode === "fix"
            ? "DNA AI Code - Kodingan Diperbaiki! 🛠️"
            : mode === "software"
            ? "DNA AI Code - Software Selesai! 💻"
            : "DNA AI Code - Web App Selesai! 🌐";

        const previewMsg = isEnglish
          ? `"${normalizedProject.projectName}" (${normalizedProject.files.length} files) is ready! Tap to view.`
          : `"${normalizedProject.projectName}" (${normalizedProject.files.length} file) sudah siap! Ketuk untuk melihat hasilnya.`;

        sendBackgroundNotification({
          title: notifTitle,
          body: previewMsg,
          url: "/ai-code",
          tag: "dna-ai-code-done",
        }).catch(() => {});
      }
    } catch (err) {
      if (typeof document !== "undefined" && document.hidden) {
        sendBackgroundNotification({
          title: "DNA AI Code - Pemberitahuan",
          body: isEnglish
            ? "An error occurred while generating code. Tap to check."
            : "Terjadi kendala saat membuat kodingan AI. Ketuk untuk memeriksa.",
          url: "/ai-code",
          tag: "dna-ai-code-error",
        }).catch(() => {});
      }

      const rawMsg = err instanceof Error ? err.message : "";
      const isNetworkOrDown =
        rawMsg.toLowerCase().includes("failed to fetch") ||
        rawMsg.toLowerCase().includes("network");

      setError(
        isNetworkOrDown
          ? (isEnglish
              ? "Connection to server failed. Please ensure your connection is active and try again."
              : "Koneksi ke server terputus. Pastikan koneksi aktif dan coba klik kirim kembali.")
          : rawMsg ||
            (isEnglish
              ? "An unexpected error occurred."
              : "Terjadi kesalahan yang tidak diketahui.")
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * Menyalin source code file yang dipilih.
   */
  async function copySelectedFile() {
    if (!selectedFile) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        isEditing
          ? editingContent
          : selectedFile.content
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  /**
   * Mulai edit file.
   */
  function startEditing() {
    if (!selectedFile) {
      return;
    }

    setEditingContent(
      selectedFile.content
    );

    setEditorDirty(false);
    setIsEditing(true);
    setCopied(false);
    setError("");
  }

  /**
   * Batalkan perubahan file.
   */
  function cancelEditing() {
    if (!selectedFile) {
      return;
    }

    setEditingContent(
      selectedFile.content
    );

    setEditorDirty(false);
    setIsEditing(false);
    setError("");
  }

  /**
   * Simpan perubahan file.
   */
  function saveFileChanges() {
    if (!project || !selectedFile) {
      return;
    }

    const updatedFiles =
      project.files.map((file) =>
        file.path === selectedFile.path
          ? {
              ...file,
              content: editingContent,
            }
          : file
      );

    const updatedProject: GeneratedProject = {
      ...project,
      files: updatedFiles,
    };

    const updatedSelectedFile =
      updatedFiles.find(
        (file) =>
          file.path === selectedFile.path
      );

    if (!updatedSelectedFile) {
      return;
    }

    setProject(updatedProject);

    setPreviewProjectFiles(
      updatedFiles
    );

    setSelectedFile(
      updatedSelectedFile
    );

    setEditingContent(
      updatedSelectedFile.content
    );

    setEditorDirty(false);
    setIsEditing(false);
    setCopied(false);
    setError("");

    setPreviewKey(
      (value) =>
        value + 1
    );
  }

  /**
   * Refresh Live Preview.
   */
  function refreshPreview() {
    if (!hasPreview || editorDirty) {
      return;
    }

    setPreviewKey(
      (value) =>
        value + 1
    );
  }

  /**
   * 1-Click Salin Kode HTML / Tailwind.
   */
  const copyHtmlCode = () => {
    const htmlFile =
      project?.files.find((f) => f.path.toLowerCase().endsWith(".html")) ||
      selectedFile;
    if (htmlFile) {
      navigator.clipboard.writeText(htmlFile.content);
      setCopied(true);
      toast.success(
        isEnglish
          ? "HTML / Tailwind code copied to clipboard!"
          : "Kode HTML / Tailwind berhasil disalin!"
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };


  /**
   * Universal Multi-Platform App Exporter (APK, Windows, Linux, HTML, ZIP).
   */
  async function downloadProject(format: "zip" | "apk" | "windows" | "linux" | "single-html" = "zip") {
    if (editorDirty) {
      setError(
        isEnglish
          ? "Please save or cancel your file changes before downloading."
          : "Simpan atau batalkan perubahan file terlebih dahulu sebelum download."
      );
      return;
    }

    if (
      !project ||
      !Array.isArray(project.files) ||
      project.files.length === 0
    ) {
      return;
    }

    try {
      setError("");
      setExportingFormat(format);

      const response = await fetch(
        "/api/ai-code/export",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectName:
              project.projectName,
            files:
              project.files,
            format,
          }),
        }
      );

      if (!response.ok) {
        let message =
          isEnglish
            ? "Failed to download the project."
            : "Gagal mengunduh project.";

        try {
          const data =
            await response.json();

          if (
            typeof data?.error ===
            "string"
          ) {
            message =
              data.error;
          }
        } catch {
          // Gunakan pesan default.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href = url;

      const safeName = project.projectName || "ai-project";
      if (format === "apk") {
        anchor.download = `${safeName}.apk`;
      } else if (format === "windows") {
        anchor.download = `${safeName}-windows-app.zip`;
      } else if (format === "linux") {
        anchor.download = `${safeName}-linux-app.zip`;
      } else if (format === "single-html") {
        anchor.download = `${safeName}.html`;
      } else {
        anchor.download = `${safeName}.zip`;
      }

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(
        url
      );

      const formatLabels: Record<string, string> = {
        apk: "Android APK (.apk)",
        windows: "Windows Desktop App",
        linux: "Linux Desktop App",
        "single-html": "Single HTML File",
        zip: "ZIP Source Code",
      };

      toast.success(
        isEnglish
          ? `Successfully downloaded ${formatLabels[format] || format}!`
          : `Berhasil mengunduh ${formatLabels[format] || format}!`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to download the project."
          : "Gagal mengunduh project.";
      setError(msg);
      toast.error(msg);
    } finally {
      setExportingFormat(null);
    }
  }

  /**
   * Membuka/menutup fullscreen.
   */
  function toggleFullscreen() {
    setPreviewFullscreen(
      (value) =>
        !value
    );
  }

  /**
   * Memilih file dari explorer.
   */
  function handleSelectFile(
    file: GeneratedFile
  ) {
    if (
      editorDirty &&
      selectedFile?.path !== file.path
    ) {
      setError(
        isEnglish
          ? "Save or cancel your current changes before selecting another file."
          : "Simpan atau batalkan perubahan terlebih dahulu sebelum memilih file lain."
      );

      return;
    }

    setSelectedFile(file);
    setCopied(false);
    setError("");
    setIsEditing(false);
    setEditingContent(file.content);
    setEditorDirty(false);
  }

  /**
   * Label status project.
   */
  const projectStatus =
    project
      ? hasPreview
        ? isEnglish
          ? "Live Preview Ready"
          : "Live Preview Siap"
        : isEnglish
        ? "Project Generated"
        : "Project Berhasil Dibuat"
      : "";

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full p-4 space-y-3">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-emerald-400" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {isEnglish ? "Projects & Sessions" : "Daftar Proyek AI"}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
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

      {/* + PROYEK BARU BUTTON */}
      <button
        type="button"
        onClick={() => handleCreateNewProject()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus size={16} />
        <span>{isEnglish ? "+ New Project" : "+ Proyek Baru"}</span>
      </button>

      {/* SEARCH INPUT */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={sessionSearch}
          onChange={(e) => setSessionSearch(e.target.value)}
          placeholder={isEnglish ? "Search projects..." : "Cari proyek..."}
          className="w-full rounded-xl border border-slate-800 bg-[#060A14] pl-8 pr-7 py-1.5 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-emerald-500/50"
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
          {CODE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-[#060A14] text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{isEnglish ? cat.labelEn : cat.labelId}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <p>{isEnglish ? "No projects found." : "Belum ada proyek di folder ini."}</p>
            <button
              type="button"
              onClick={() => handleCreateNewProject(selectedCategory === "all" ? "web" : selectedCategory)}
              className="mt-2 text-emerald-400 hover:underline"
            >
              {isEnglish ? "+ Create new project" : "+ Buat proyek baru"}
            </button>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const catMeta = CODE_CATEGORIES.find((c) => c.id === session.category) || CODE_CATEGORIES[1];
            const isEditing = editingSessionId === session.id;

            return (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition cursor-pointer border ${
                  isActive
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-[#060A14]/70 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white hover:border-slate-700"
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
                        className="w-full rounded bg-slate-950 px-1.5 py-0.5 text-xs text-white outline-none border border-emerald-500"
                      />
                      <button type="submit" className="text-emerald-400 hover:text-white">
                        <Check size={12} />
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium leading-5">
                        {session.title}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {session.project?.files?.length || 0} {isEnglish ? "files" : "file"} • {formatTimeAgo(session.updatedAt, locale)}
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
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-emerald-300 transition"
                        title={isEnglish ? "Move to folder" : "Pindah folder"}
                      >
                        <Folder size={12} />
                      </button>

                      {categoryMenuSessionId === session.id && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur">
                          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase">
                            {isEnglish ? "Select Folder" : "Pilih Folder"}
                          </div>
                          {CODE_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
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
                      title={isEnglish ? "Delete" : "Hapus proyek"}
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
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Code2
                  size={26}
                  className="text-emerald-400"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  AI Code Builder
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  {isEnglish
                    ? "Build real web projects with AI and preview them instantly."
                    : "Bangun project web dengan AI dan lihat hasilnya secara langsung."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {project && (
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2
                    size={15}
                    className="text-emerald-400"
                  />

                  <span className="text-xs font-medium text-emerald-300">
                    {projectStatus}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSidebarOpen((prev) => !prev);
                  setMobileSidebarOpen((prev) => !prev);
                }}
                className={`flex h-10 items-center gap-2 rounded-2xl border px-3.5 text-xs font-semibold transition ${
                  sidebarOpen || mobileSidebarOpen
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    : "border-slate-800 bg-[#0B1120] text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
                title={sidebarOpen ? (isEnglish ? "Hide Projects" : "Sembunyikan Proyek") : (isEnglish ? "Show Projects" : "Daftar Proyek")}
              >
                <PanelLeft size={16} className="text-emerald-400" />
                <span className="hidden sm:inline">{isEnglish ? "Projects" : "Daftar Proyek"}</span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-500/20">
                  {sessions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateNewProject()}
                className="flex h-10 items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-xs font-semibold text-white shadow-lg transition hover:scale-105 active:scale-95"
                title={isEnglish ? "New Project" : "+ Proyek Baru"}
              >
                <Plus size={16} />
                <span>{isEnglish ? "New Project" : "+ Proyek Baru"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================
            MAIN LAYOUT: SIDEBAR + CONTENT
        ========================================== */}

        <div className="relative flex gap-6 overflow-hidden items-start">
          {/* DESKTOP SIDEBAR */}
          {sidebarOpen && (
            <aside className="hidden md:flex w-72 lg:w-80 shrink-0 flex-col rounded-3xl border border-slate-800 bg-[#0B1120] shadow-2xl overflow-hidden min-h-[640px] max-h-[820px] transition-all duration-300">
              {renderSidebarContent()}
            </aside>
          )}

          {/* MOBILE DRAWER OVERLAY */}
          {mobileSidebarOpen && (
            <div
              className="fixed inset-0 z-50 flex md:hidden bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <div
                className="w-80 max-w-[85vw] h-full flex flex-col bg-[#0B1120] border-r border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {renderSidebarContent()}
              </div>
            </div>
          )}

          <div className="grid flex-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)] min-w-0">

          {/* ========================================
              INPUT PANEL
          ======================================== */}

          <section className="rounded-3xl border border-slate-800 bg-[#0B1120] p-5 shadow-2xl sm:p-6">

            {/* INPUT HEADER */}

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Sparkles
                  size={20}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  {isEnglish
                    ? "Build with AI"
                    : "Bangun dengan AI"}
                </h2>

                <p className="text-xs text-slate-500">
                  {isEnglish
                    ? "Describe the project you want to create."
                    : "Jelaskan project yang ingin kamu buat."}
                </p>
              </div>
            </div>

            {/* CODEX MODE SELECTOR */}
            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isEnglish ? "Codex Engine Mode" : "Mode Kemampuan AI"}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-[#060A14] p-1.5">
                <button
                  type="button"
                  onClick={() => setMode("web")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-2.5 px-1 text-center transition ${
                    mode === "web"
                      ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Globe size={18} className={mode === "web" ? "text-emerald-400" : "text-slate-400"} />
                  <span className="text-xs font-medium leading-none">
                    {isEnglish ? "Web & Fullstack App" : "Web & Aplikasi Modern"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("software")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-2.5 px-1 text-center transition ${
                    mode === "software"
                      ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Terminal size={18} className={mode === "software" ? "text-blue-400" : "text-slate-400"} />
                  <span className="text-xs font-medium leading-none">
                    {isEnglish ? "Software & Backend" : "Software & Backend"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("fix")}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-2.5 px-1 text-center transition ${
                    mode === "fix"
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Wrench size={18} className={mode === "fix" ? "text-amber-400" : "text-slate-400"} />
                  <span className="text-xs font-medium leading-none">
                    {isEnglish ? "Fix Code / Debug" : "Perbaiki Error / Debug"}
                  </span>
                </button>
              </div>
            </div>

            {/* QUICK PRESET CHIPS */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-medium text-slate-500">
                {isEnglish ? "⚡ 50X Smart Architecture Inspiration" : "⚡ 50X Inspirasi Arsitektur Pintar"}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {mode === "web" && [
                  isEnglish ? "Enterprise SaaS Analytics Dashboard + Live SVG Charts" : "Dashboard SaaS Enterprise + Analitik Interaktif & Grafik SVG",
                  isEnglish ? "Fullstack E-Commerce Storefront + Cart Drawer & Modal" : "Toko Online Modern + Keranjang Belanja & Modal Checkout",
                  isEnglish ? "Interactive Kanban Board + Drag & Drop + LocalStorage Sync" : "Kanban Board Interaktif + Drag & Drop + Sinkronisasi LocalStorage",
                  isEnglish ? "Real-time Crypto Portfolio Tracker + Dynamic Charts" : "Pelacak Portofolio Saham/Kripto + Grafik Interaktif & Metrik",
                  isEnglish ? "AI Prompt Studio & Model Playground + Glassmorphism UI" : "Studio Prompt AI Futuristik + Dark Obsidian Glassmorphism",
                  isEnglish ? "Interactive Medical Booking Portal + Calendar & Filter" : "Portal Reservasi Interaktif + Kalender & Filter Kategori",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrompt(preset)}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    + {preset}
                  </button>
                ))}

                {mode === "software" && [
                  isEnglish ? "Python FastAPI Microservice + Pydantic + SQLite + CSV Export" : "Python FastAPI Microservice + Pydantic + SQLite + Ekspor CSV",
                  isEnglish ? "Go High-Concurrency Worker Pool REST API + Channels" : "Golang High-Concurrency Worker Pool REST API + Goroutines",
                  isEnglish ? "Rust Fast Multi-threaded File Indexer + Regex Search" : "Rust Multi-threaded File Indexer Berkecepatan Tinggi",
                  isEnglish ? "C++20 High-Performance Memory-Safe Graph Algorithm + STL" : "C++20 Algoritma Graf Kompleks + Memori Efisien & RAII",
                  isEnglish ? "Java Clean Architecture CRUD + DTO Validation & Service Layer" : "Java Clean Architecture CRUD + Validasi DTO & Service Layer",
                  isEnglish ? "SQL Advanced Database Schema + Indexes, Views & CTE Queries" : "SQL Skema Database Lanjutan + Indeks, Views & Analitik CTE",
                  isEnglish ? "Production Bash Automation Script + Argument Parser & Trap" : "Skrip Otomasi Bash Produksi + Parser Argumen & Error Trap",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrompt(preset)}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-blue-500/40 hover:text-blue-300"
                  >
                    + {preset}
                  </button>
                ))}

                {mode === "fix" && [
                  isEnglish ? "Deep static analysis & zero-defect memory leak repair" : "Analisis mendalam & perbaiki kebocoran memori (memory leak)",
                  isEnglish ? "Diagnose async race condition, stale closures & API crash" : "Diagnosa race condition asinkron & penanganan API gagal",
                  isEnglish ? "Fix layout breaking, CSS responsiveness & state reactivity" : "Perbaiki error reactivity state & layout glitch responsif",
                  isEnglish ? "Fix runtime null pointer, boundary errors & undefined trap" : "Perbaiki runtime error, null pointer & boundary trap",
                  isEnglish ? "Optimize O(n²) algorithmic bottleneck to O(n) clean logic" : "Optimalisasi bottleneck O(n²) ke O(n) & arsitektur bersih",
                  isEnglish ? "Security audit & harden input validation against XSS/SQLi" : "Audit keamanan & perkuat validasi input anti-XSS/SQLi",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrompt(preset)}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-amber-500/40 hover:text-amber-300"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* PROMPT */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {mode === "fix"
                  ? isEnglish
                    ? "Paste your broken code or describe the error:"
                    : "Salin kode yang eror atau jelaskan masalahnya:"
                  : mode === "software"
                  ? isEnglish
                    ? "What program, software, or backend do you want to build?"
                    : "Program, backend, atau software apa yang ingin kamu buat?"
                  : isEnglish
                  ? "What web application do you want to build?"
                  : "Aplikasi web apa yang ingin kamu buat?"}
              </label>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(
                    event.target.value
                  )
                }
                placeholder={
                  mode === "software"
                    ? isEnglish
                      ? "Example: Build a complete Python CLI tool with SQLite database for inventory tracking, featuring CRUD, CSV export, and clear run instructions. (Or ask in C++, Java, Go, Rust, C#, PHP, etc.)..."
                      : "Contoh: Buatkan program Python lengkap dengan database SQLite untuk manajemen stok barang, fitur tambah/edit/hapus/laporan CSV dan petunjuk menjalankannya. (Atau bahasa lain: C++, Java, C#, Go, Rust, PHP, Bash, dll.)..."
                    : mode === "fix"
                    ? isEnglish
                      ? "Example: Paste any broken code, compiler errors, or stack traces here. AI will detect bugs across all languages, explain what broke, and provide 100% fixed, working code..."
                      : "Contoh: Salin kode yang eror, pesan stack trace, atau deskripsi bug bahasa apa saja di sini. AI akan mendiagnosa penyebab eror, memperbaikinya, dan memberikan kode baru yang bersih dan langsung bisa dijalankan..."
                    : isEnglish
                    ? "Example: Build a modern responsive SaaS analytics dashboard with interactive charts, dark mode glassmorphism, search filters, and persistent data..."
                    : "Contoh: Buatkan website dashboard analitik SaaS modern dan responsif dengan grafik interaktif, dark mode glassmorphism, filter pencarian, dan data tersimpan..."
                }
                className="min-h-[160px] w-full resize-y rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>

            {/* FILE NAME */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                {isEnglish
                  ? "Main File / Entrypoint"
                  : "File Utama / Entrypoint"}
              </label>

              <div className="relative">
                <FileCode2
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={fileName}
                  onChange={(event) =>
                    setFileName(
                      event.target.value
                    )
                  }
                  placeholder="index.html"
                  className="w-full rounded-2xl border border-slate-700 bg-[#020617] py-2.5 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* EXISTING CODE / BROKEN CODE */}
            <div className={`mt-4 rounded-2xl transition p-3 ${
              mode === "fix"
                ? "border-2 border-amber-500/40 bg-amber-500/5 shadow-md"
                : "border border-slate-800 bg-[#060A14]"
            }`}>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                {mode === "fix"
                  ? isEnglish
                    ? "⚠️ Paste Broken / Error Code Here"
                    : "⚠️ Tempel Kodingan yang Error / Rusak di Sini"
                  : isEnglish
                  ? "Existing Code / Context (Optional)"
                  : "Kode / Context yang Ada (Opsional)"}
              </label>

              <textarea
                value={codeContext}
                onChange={(event) =>
                  setCodeContext(
                    event.target.value
                  )
                }
                placeholder={
                  mode === "fix"
                    ? isEnglish
                      ? "Paste your broken HTML, CSS, or JS code here. AI will fix syntax, logic, and layout bugs..."
                      : "Tempel kodinganmu yang rusak/error di sini. AI akan menganalisis dan memperbaikinya secara tuntas..."
                    : isEnglish
                    ? "Paste existing code if you want AI to modify or extend it..."
                    : "Tempel kode jika ingin AI memperbaiki atau mengembangkannya..."
                }
                className="min-h-[160px] w-full resize-y rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 font-mono text-xs leading-6 text-slate-200 outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  {error}
                </span>
              </div>
            )}

            {/* BUILD BUTTON */}

            {project && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs leading-5 text-cyan-200">
                <RefreshCw
                  size={16}
                  className="mt-0.5 shrink-0 text-cyan-400"
                />

                <span>
                  {isEnglish
                    ? "Project exists. Your next prompt will modify the current project instead of starting from scratch."
                    : "Project sudah ada. Prompt berikutnya akan mengubah project yang sekarang, bukan membuat dari nol."}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={
                generateCode
              }
              disabled={
                loading ||
                !prompt.trim()
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-3.5 font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  <span>
                    {isRegenerate
                      ? isEnglish
                        ? "Regenerating Project..."
                        : "Regenerasi Project..."
                      : isEnglish
                      ? "Building Project..."
                      : "Membangun Project..."}
                  </span>
                </>
              ) : (
                <>
                  {isRegenerate ? (
                    <RefreshCw size={18} />
                  ) : (
                    <Send size={18} />
                  )}

                  <span>
                    {isRegenerate
                      ? isEnglish
                        ? "Regenerate Project"
                        : "Regenerate Project"
                      : isEnglish
                      ? "Build Project"
                      : "Build Project"}
                  </span>
                </>
              )}
            </button>

            {/* PROJECT INFORMATION */}

            {project && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-[#020617] p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FolderOpen
                      size={16}
                      className="shrink-0 text-emerald-400"
                    />

                    <span className="truncate text-sm font-semibold text-white">
                      {
                        project.projectName
                      }
                    </span>
                  </div>

                  {hasPreview && (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                      LIVE
                    </span>
                  )}
                </div>

                {project.description && (
                  <p className="text-xs leading-5 text-slate-500">
                    {
                      project.description
                    }
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-[#080D1A] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      {isEnglish
                        ? "Project Files"
                        : "File Project"}
                    </p>

                    <p className="mt-1 text-lg font-semibold text-slate-200">
                      {
                        projectFiles.length
                      }
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#080D1A] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      {isEnglish
                        ? "Preview Files"
                        : "File Preview"}
                    </p>

                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      {
                        previewFiles.length
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ========================================
              BUILDER PANEL
          ======================================== */}

          <section
            className={
              previewFullscreen
                ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#0B1120] shadow-2xl"
                : "min-h-[700px] overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1120] shadow-2xl"
            }
          >

            {/* ========================================================
                UPGRADED TOP BAR: TABS, RESPONSIVE CONTROLS, ACTIONS
            ======================================================== */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3.5 sm:px-6 bg-[#080D1A]/90 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>

                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-200">
                  <Terminal size={15} className="shrink-0 text-cyan-400" />
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">
                    {project?.projectName || (isEnglish ? "Component Sandbox" : "Sandbox Komponen")}
                  </span>
                </div>
              </div>

              {/* CENTER: V0 / CODEPEN MODE TABS */}
              <div className="flex items-center rounded-xl border border-slate-800 bg-[#060A14] p-1">
                <button
                  type="button"
                  onClick={() => setBuilderTab("preview")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    builderTab === "preview"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                  title="Lihat UI Interaktif Hidup (Full Canvas)"
                >
                  <Eye size={13} className={builderTab === "preview" ? "text-emerald-400" : "text-slate-500"} />
                  <span>Live Preview</span>
                  {hasPreview && (
                    <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBuilderTab("code")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    builderTab === "code"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                  title="Lihat & Edit Source Code"
                >
                  <Code2 size={13} className={builderTab === "code" ? "text-cyan-400" : "text-slate-500"} />
                  <span>Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBuilderTab("split")}
                  className={`hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    builderTab === "split"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                  title="Tampilan Split: Code di Kiri & Live Preview di Kanan (Gaya CodePen)"
                >
                  <Columns size={13} className={builderTab === "split" ? "text-purple-400" : "text-slate-500"} />
                  <span>Split Sandbox</span>
                </button>
              </div>

              {/* RIGHT: RESPONSIVE DEVICE TOGGLE & ACTIONS */}
              <div className="flex items-center gap-2">
                {/* DEVICE TOGGLE (DESKTOP, TABLET, MOBILE) */}
                {(builderTab === "preview" || builderTab === "split") && (
                  <div className="hidden sm:flex items-center rounded-xl border border-slate-800 bg-[#060A14] p-0.5">
                    <button
                      type="button"
                      title={isEnglish ? "Desktop View (100%)" : "Layar Desktop (100%)"}
                      onClick={() => setDeviceMode("desktop")}
                      className={`rounded-lg p-1.5 transition ${
                        deviceMode === "desktop"
                          ? "bg-slate-700/70 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      type="button"
                      title={isEnglish ? "Tablet View (768px)" : "Layar Tablet (768px)"}
                      onClick={() => setDeviceMode("tablet")}
                      className={`rounded-lg p-1.5 transition ${
                        deviceMode === "tablet"
                          ? "bg-slate-700/70 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Tablet size={14} />
                    </button>
                    <button
                      type="button"
                      title={isEnglish ? "Mobile View (380px)" : "Layar HP (380px)"}
                      onClick={() => setDeviceMode("mobile")}
                      className={`rounded-lg p-1.5 transition ${
                        deviceMode === "mobile"
                          ? "bg-slate-700/70 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Smartphone size={14} />
                    </button>
                  </div>
                )}

                {project && (
                  <>
                    {/* 1-CLICK COPY HTML / TAILWIND */}
                    <button
                      type="button"
                      onClick={copyHtmlCode}
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95"
                      title={isEnglish ? "Copy HTML & Tailwind Code" : "Salin Kode HTML & Tailwind"}
                    >
                      {copied ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span className="hidden sm:inline">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span className="hidden sm:inline">Copy HTML</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={refreshPreview}
                      disabled={!hasPreview}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Refresh Preview"
                    >
                      <RefreshCw size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportModalOpen(true)}
                      disabled={project.files.length === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 shadow-md shadow-cyan-950/40 transition hover:border-cyan-400 hover:from-cyan-500/30 hover:to-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Universal Multi-Platform App Exporter (Android APK, Windows, Linux, Web)"
                    >
                      <Zap size={13} className="text-cyan-400 animate-pulse" />
                      <span>Export App</span>
                      <span className="rounded bg-cyan-500/30 px-1 py-0.5 text-[9px] font-bold text-cyan-100 uppercase tracking-wider">
                        APK / PC
                      </span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  disabled={!project}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Fullscreen"
                >
                  {previewFullscreen ? <X size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* ========================================================
                BUILDER CONTENT: DYNAMIC VIEW (PREVIEW / CODE / SPLIT)
            ======================================================== */}

            {/* CASE 1: FULL LIVE PREVIEW TAB (V0 STYLE) */}
            {builderTab === "preview" && (
              <div className="relative flex-1 min-h-[640px] flex flex-col bg-[#020617] overflow-hidden p-3 sm:p-5">
                {loading ? (
                  <div className="flex h-full min-h-[580px] flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <Loader2 size={32} className="animate-spin text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {isRegenerate
                        ? (isEnglish ? "Regenerating component..." : "Sedang meregenerasi komponen...")
                        : (isEnglish ? "Building live component..." : "Sedang membangun komponen interaktif...")}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                      {isEnglish
                        ? "AI is assembling HTML, Tailwind CSS, and scripts for the live preview."
                        : "AI sedang meracik HTML, Tailwind CSS, dan skrip untuk Live Preview."}
                    </p>
                  </div>
                ) : hasPreview ? (
                  <div className="flex-1 flex items-center justify-center min-h-[580px] w-full">
                    {/* PHONE FRAME (MOBILE VIEW) */}
                    {deviceMode === "mobile" ? (
                      <div className="relative w-[380px] max-w-full h-[620px] rounded-[38px] border-[8px] border-slate-800 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden ring-2 ring-slate-700/50 flex flex-col">
                        {/* Phone Top Notch Speaker */}
                        <div className="w-full h-6 bg-slate-900 flex items-center justify-center shrink-0 border-b border-slate-800">
                          <div className="h-1.5 w-16 bg-slate-700 rounded-full" />
                        </div>
                        <iframe
                          key={previewKey}
                          title={project?.projectName || "AI Code Preview"}
                          srcDoc={previewHtml}
                          sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-pointer-lock"
                          allow="autoplay; fullscreen; pointer-lock"
                          className="flex-1 w-full border-0 bg-white"
                        />
                      </div>
                    ) : deviceMode === "tablet" ? (
                      /* TABLET FRAME */
                      <div className="relative w-[768px] max-w-full h-[620px] rounded-2xl border-[6px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden ring-1 ring-slate-700 flex flex-col">
                        <iframe
                          key={previewKey}
                          title={project?.projectName || "AI Code Preview"}
                          srcDoc={previewHtml}
                          sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-pointer-lock"
                          allow="autoplay; fullscreen; pointer-lock"
                          className="flex-1 w-full border-0 bg-white"
                        />
                      </div>
                    ) : (
                      /* DESKTOP VIEW (100% CANVAS) */
                      <div className="w-full h-[620px] rounded-2xl border border-slate-800 bg-white shadow-2xl overflow-hidden">
                        <iframe
                          key={previewKey}
                          title={project?.projectName || "AI Code Preview"}
                          srcDoc={previewHtml}
                          sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-pointer-lock"
                          allow="autoplay; fullscreen; pointer-lock"
                          className="h-full w-full border-0"
                        />
                      </div>
                    )}
                  </div>
                ) : project ? (
                  <div className="flex h-full min-h-[580px] flex-col items-center justify-center p-6 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      <Terminal size={32} />
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-3">
                      <Sparkles size={13} />
                      <span>{isEnglish ? "Software / CLI Project Ready" : "Program / Skrip Siap Digunakan"}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {project.projectName || (isEnglish ? "Program Generated" : "Program Berhasil Dibuat")}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                      {isEnglish
                        ? "This project is built for backend / terminal execution. Open the Code tab to inspect source files, edit live, or copy execution commands."
                        : "Proyek ini dirancang untuk dieksekusi di Terminal / Konsol. Buka tab Code untuk memeriksa seluruh file kode, mengedit langsung, atau menyalin petunjuk eksekusi."}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setBuilderTab("code")}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition active:scale-95"
                      >
                        <FileCode2 size={15} />
                        <span>{isEnglish ? "View & Edit Code" : "Buka Tab Kode & File"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={copySelectedFile}
                        className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copied ? (isEnglish ? "Copied!" : "Tersalin!") : (isEnglish ? "Copy Code" : "Salin Kode")}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[580px] flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700">
                      <Eye size={30} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      Live Component Sandbox
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                      {isEnglish
                        ? "Enter a prompt or select a mode above to build apps, write scripts in any language, or fix broken code!"
                        : "Ketik prompt atau pilih mode di atas untuk membangun web, skrip bahasa apa saja, atau perbaiki kode eror!"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CASE 2: SOURCE CODE VIEW TAB */}
            {builderTab === "code" && (
              <div className="grid min-h-[640px] flex-1 lg:grid-cols-[230px_minmax(0,1fr)]">
                {/* FILE EXPLORER */}
                <aside className="border-b border-slate-800 bg-[#080D1A] lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={15} className="text-cyan-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {isEnglish ? "Project Files" : "File Project"}
                      </span>
                    </div>
                    {project && (
                      <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-800">
                        {projectFiles.length} file
                      </span>
                    )}
                  </div>

                  <div className="max-h-[220px] overflow-y-auto p-2 lg:max-h-[600px] space-y-1">
                    {projectFiles.map((file) => {
                      const active = selectedFile?.path === file.path;
                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => handleSelectFile(file)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                            active
                              ? "bg-cyan-500/15 text-cyan-300 font-medium border border-cyan-500/30"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <FileCode2 size={14} className="shrink-0" />
                          <span className="truncate">{file.path}</span>
                        </button>
                      );
                    })}

                    {!project && (
                      <div className="px-3 py-4 text-xs leading-5 text-slate-600">
                        {isEnglish ? "Generated files will appear here." : "File hasil AI akan muncul di sini."}
                      </div>
                    )}
                  </div>
                </aside>

                {/* CODE VIEWER / LIVE EDITOR */}
                <div className="flex flex-col min-h-0 bg-[#060A14]">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-[#080D1A]">
                    <div className="flex min-w-0 items-center gap-2">
                      <Code2 size={15} className="shrink-0 text-cyan-400" />
                      <span className="truncate text-xs font-semibold text-slate-300">
                        {selectedFile?.path || "Source Code"}
                      </span>
                      {isEditing && (
                        <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 font-semibold">
                          Editing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedFile && !isEditing && (
                        <button
                          type="button"
                          onClick={startEditing}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      )}

                      {selectedFile && isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="flex items-center gap-1 rounded-xl border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                          >
                            <Undo2 size={13} />
                            <span>Batal</span>
                          </button>

                          <button
                            type="button"
                            onClick={saveFileChanges}
                            disabled={!editorDirty}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 shadow-sm transition hover:bg-emerald-500/30 disabled:opacity-40"
                          >
                            <Zap size={13} />
                            <span>Update Preview</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={copySelectedFile}
                        disabled={!selectedFile}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copied ? "Tersalin" : "Salin"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-6 text-slate-300">
                    {selectedFile ? (
                      isEditing ? (
                        <textarea
                          value={editingContent}
                          onChange={(e) => {
                            setEditingContent(e.target.value);
                            setEditorDirty(e.target.value !== selectedFile.content);
                          }}
                          spellCheck={false}
                          wrap="off"
                          autoFocus
                          className="h-full min-h-[540px] w-full resize-none border-0 bg-transparent p-0 font-mono text-xs leading-6 text-cyan-200 outline-none focus:ring-0"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words">{selectedFile.content}</pre>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs text-slate-600">
                        {isEnglish ? "Select a file to inspect its code." : "Pilih file untuk melihat kodenya."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CASE 3: SPLIT SANDBOX TAB (CODE ON LEFT, LIVE PREVIEW ON RIGHT) */}
            {builderTab === "split" && (
              <div className="grid min-h-[640px] flex-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                {/* LEFT: CODE VIEW & EDITOR */}
                <div className="flex flex-col min-h-0 bg-[#060A14]">
                  {/* File Selector Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 p-2 bg-[#080D1A]">
                    {projectFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => handleSelectFile(file)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                          selectedFile?.path === file.path
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : "text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {file.path}
                      </button>
                    ))}
                    {selectedFile && isEditing && (
                      <button
                        type="button"
                        onClick={saveFileChanges}
                        disabled={!editorDirty}
                        className="ml-auto flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        <Zap size={12} />
                        <span>Run</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-6 text-slate-300">
                    {selectedFile ? (
                      isEditing ? (
                        <textarea
                          value={editingContent}
                          onChange={(e) => {
                            setEditingContent(e.target.value);
                            setEditorDirty(e.target.value !== selectedFile.content);
                          }}
                          spellCheck={false}
                          wrap="off"
                          className="h-full min-h-[540px] w-full resize-none border-0 bg-transparent p-0 font-mono text-xs leading-6 text-cyan-200 outline-none"
                        />
                      ) : (
                        <div
                          onClick={startEditing}
                          className="cursor-pointer"
                          title="Klik untuk mengedit kode ini live"
                        >
                          <pre className="whitespace-pre-wrap break-words">{selectedFile.content}</pre>
                        </div>
                      )
                    ) : null}
                  </div>
                </div>

                {/* RIGHT: LIVE INTERACTIVE PREVIEW */}
                <div className="flex flex-col min-h-0 bg-[#020617] p-3 sm:p-4">
                  {hasPreview ? (
                    <div className="w-full h-full min-h-[560px] rounded-xl border border-slate-800 bg-white overflow-hidden shadow-2xl">
                      <iframe
                        key={previewKey}
                        title={project?.projectName || "AI Code Preview"}
                        srcDoc={previewHtml}
                        sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-pointer-lock"
                        allow="autoplay; fullscreen; pointer-lock"
                        className="h-full w-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">
                      Live Preview akan muncul di sini.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      </div>


      {/* ==========================================
          UNIVERSAL MULTI-PLATFORM APP EXPORTER MODAL
      ========================================== */}
      {exportModalOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-400">
                  <Zap size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Universal App Exporter
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                      Multi-Platform
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ekspor "{project.projectName}" langsung jadi aplikasi siap pakai tanpa koding ulang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 4 Platform Cards */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">

              {/* CARD 1: ANDROID APK (.apk) */}
              <div className="group rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-slate-900/60 p-4 transition hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">Android Mobile App (.apk)</h4>
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                          Bisa Kirim via WA
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        File installer .apk asli. Bisa langsung dikirim lewat WhatsApp, di-install di HP Android siapa saja, dan berjalan 100% offline dengan ikon di home screen.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProject("apk")}
                    disabled={Boolean(exportingFormat)}
                    className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2.5 text-xs shadow-md shadow-cyan-950/50 transition disabled:opacity-50"
                  >
                    {exportingFormat === "apk" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Mengemas APK...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Download .APK</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 2: WINDOWS DESKTOP APP (.zip) */}
              <div className="group rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/20 to-slate-900/60 p-4 transition hover:border-blue-400 hover:shadow-lg hover:shadow-blue-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">Windows Desktop App (.exe / .bat)</h4>
                        <span className="rounded bg-blue-500/20 border border-blue-500/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                          Windows 10 / 11
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Paket aplikasi desktop mandiri. Klik ganda 'run.bat' atau 'run-silent.vbs' untuk membuka aplikasi di jendela native desktop tanpa address bar browser.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProject("windows")}
                    disabled={Boolean(exportingFormat)}
                    className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 text-xs shadow-md shadow-blue-950/50 transition disabled:opacity-50"
                  >
                    {exportingFormat === "windows" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Mengemas Windows...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Download Windows</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 3: LINUX DESKTOP APP (.zip) */}
              <div className="group rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-900/60 p-4 transition hover:border-amber-400 hover:shadow-lg hover:shadow-amber-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Terminal size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">Linux Desktop App (.sh / .desktop)</h4>
                        <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                          Ubuntu / Debian / Arch
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Paket aplikasi mandiri untuk Linux dengan skrip peluncur 'run.sh' otomatis dan shortcut menu '.desktop' terintegrasi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadProject("linux")}
                    disabled={Boolean(exportingFormat)}
                    className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2.5 text-xs shadow-md shadow-amber-950/50 transition disabled:opacity-50"
                  >
                    {exportingFormat === "linux" ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Mengemas Linux...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Download Linux</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CARD 4: WEB STANDALONE & FULL SOURCE CODE */}
              <div className="group rounded-xl border border-slate-700 bg-slate-950/40 p-4 transition hover:border-slate-600">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">Web Standalone & Source Code</h4>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                          HTML & ZIP
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Unduh 1 file HTML mandiri tanpa server, atau unduh seluruh kode sumber proyek dalam file ZIP.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadProject("single-html")}
                      disabled={Boolean(exportingFormat)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-3 py-2 text-xs transition disabled:opacity-50"
                      title="Unduh 1 File HTML Mandiri"
                    >
                      {exportingFormat === "single-html" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Single HTML</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadProject("zip")}
                      disabled={Boolean(exportingFormat)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium px-3 py-2 text-xs transition disabled:opacity-50"
                      title="Unduh Source Code ZIP"
                    >
                      {exportingFormat === "zip" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      <span>Source ZIP</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 px-5 py-3 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={13} /> Siap di-install & 100% offline
              </span>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          FULLSCREEN BACKDROP
      ========================================== */}

      {previewFullscreen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={
            toggleFullscreen
          }
          aria-hidden="true"
        />
      )}
    </main>
  );
}