"use client";

import {
  useEffect,
  useMemo,
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
} from "lucide-react";

import { useLanguage } from "@/components/shared/language-provider";
import { addNotification } from "@/components/notifications/notification-store";

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

  const [prompt, setPrompt] = useState("");

  const [codeContext, setCodeContext] =
    useState("");

  const [fileName, setFileName] =
    useState("");

  const [project, setProject] =
    useState<GeneratedProject | null>(null);

  const isRegenerate = Boolean(project);

  const [previewProjectFiles, setPreviewProjectFiles] =
    useState<GeneratedFile[]>([]);

  const [selectedFile, setSelectedFile] =
    useState<GeneratedFile | null>(null);

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "An unexpected error occurred."
          : "Terjadi kesalahan yang tidak diketahui."
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
   * Download seluruh project sebagai ZIP.
   */
  async function downloadProject() {
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

      anchor.download =
        `${project.projectName || "ai-project"}.zip`;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEnglish
          ? "Failed to download the project."
          : "Gagal mengunduh project."
      );
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
          </div>
        </div>

        {/* ==========================================
            MAIN LAYOUT
        ========================================== */}

        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">

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

            {/* PROMPT */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {isEnglish
                  ? "What do you want to build?"
                  : "Apa yang ingin kamu buat?"}
              </label>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(
                    event.target.value
                  )
                }
                placeholder={
                  isEnglish
                    ? "Example: Build a modern responsive inventory management website..."
                    : "Contoh: Buatkan website inventaris barang modern dan responsive..."
                }
                className="min-h-[180px] w-full resize-y rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
              />
            </div>

            {/* FILE NAME */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {isEnglish
                  ? "Main File / Context"
                  : "File Utama / Context"}
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
                  className="w-full rounded-2xl border border-slate-700 bg-[#020617] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* EXISTING CODE */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                {isEnglish
                  ? "Existing Code / Context"
                  : "Kode / Context yang Ada"}
              </label>

              <textarea
                value={codeContext}
                onChange={(event) =>
                  setCodeContext(
                    event.target.value
                  )
                }
                placeholder={
                  isEnglish
                    ? "Paste existing code if you want AI to modify or extend it..."
                    : "Tempel kode jika ingin AI memperbaiki atau mengembangkannya..."
                }
                className="min-h-[180px] w-full resize-y rounded-2xl border border-slate-700 bg-[#020617] px-4 py-3 font-mono text-xs leading-6 text-slate-200 outline-none transition placeholder:font-sans placeholder:text-slate-600 focus:border-emerald-500"
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

            {/* TOP BAR */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>

                <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-300">
                  <Terminal
                    size={16}
                    className="shrink-0"
                  />

                  <span className="truncate">
                    {project?.projectName ||
                      "AI Code Builder"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {project && (
                  <>
                    <button
                      type="button"
                      onClick={
                        downloadProject
                      }
                      disabled={
                        project.files.length ===
                        0
                      }
                      className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download
                        size={14}
                      />

                      <span className="hidden sm:inline">
                        {isEnglish
                          ? "Download"
                          : "Download"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={
                        refreshPreview
                      }
                      disabled={
                        !hasPreview
                      }
                      className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RefreshCw
                        size={14}
                      />

                      <span className="hidden sm:inline">
                        Refresh
                      </span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={
                    toggleFullscreen
                  }
                  disabled={
                    !project
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {previewFullscreen ? (
                    <X size={14} />
                  ) : (
                    <Maximize2
                      size={14}
                    />
                  )}

                  <span className="hidden sm:inline">
                    {previewFullscreen
                      ? isEnglish
                        ? "Exit"
                        : "Keluar"
                      : isEnglish
                      ? "Fullscreen"
                      : "Layar Penuh"}
                  </span>
                </button>
              </div>
            </div>

            {/* BUILDER CONTENT */}

            <div className="grid min-h-[640px] flex-1 lg:grid-cols-[220px_minmax(0,1fr)]">

              {/* ====================================
                  FILE EXPLORER
              ==================================== */}

              <aside className="border-b border-slate-800 bg-[#080D1A] lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen
                      size={15}
                      className="text-slate-500"
                    />

                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {isEnglish
                        ? "Project Files"
                        : "File Project"}
                    </span>
                  </div>

                  {project && (
                    <span className="text-[10px] text-slate-600">
                      {
                        projectFiles.length
                      }
                    </span>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto p-2 lg:max-h-[600px]">
                  {projectFiles.map(
                    (file) => {
                      const active =
                        selectedFile?.path ===
                        file.path;

                      return (
                        <button
                          key={
                            file.path
                          }
                          type="button"
                          onClick={() =>
                            handleSelectFile(
                              file
                            )
                          }
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                            active
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          }`}
                        >
                          <FileCode2
                            size={14}
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {
                              file.path
                            }
                          </span>
                        </button>
                      );
                    }
                  )}

                  {!project && (
                    <div className="px-3 py-4 text-xs leading-5 text-slate-600">
                      {isEnglish
                        ? "Generated files will appear here."
                        : "File hasil AI akan muncul di sini."}
                    </div>
                  )}

                  {project &&
                    projectFiles.length ===
                      0 && (
                      <div className="px-3 py-4 text-xs leading-5 text-slate-600">
                        {isEnglish
                          ? "No usable files."
                          : "Tidak ada file yang dapat digunakan."}
                      </div>
                    )}
                </div>
              </aside>

              {/* ====================================
                  MAIN AREA
              ==================================== */}

              <div className="grid min-h-0 grid-rows-[minmax(360px,1fr)_240px]">

                {/* ==================================
                    LIVE PREVIEW
                ================================== */}

                <div className="relative min-h-0 bg-[#020617]">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Eye
                        size={15}
                        className="text-emerald-400"
                      />

                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Live Preview
                      </span>
                    </div>

                    {hasPreview && (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="h-[calc(100%-45px)] p-3 sm:p-5">
                    {loading ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                          <Loader2
                            size={30}
                            className="animate-spin text-emerald-400"
                          />
                        </div>

                        <h3 className="text-lg font-semibold text-white">
                          {isRegenerate
                            ? isEnglish
                              ? "Regenerating your project..."
                              : "Sedang meregenerasi project..."
                            : isEnglish
                            ? "Building your project..."
                            : "Sedang membangun project..."}
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                          {isRegenerate
                            ? isEnglish
                              ? "AI is applying your new request to the existing project and preparing the updated preview."
                              : "AI sedang menerapkan permintaan baru ke project yang ada dan menyiapkan preview terbaru."
                            : isEnglish
                            ? "AI is creating the files and preparing the live preview."
                            : "AI sedang membuat file dan menyiapkan live preview."}
                        </p>
                      </div>
                    ) : hasPreview ? (
                      <div className="h-full overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
                        <iframe
                          key={
                            previewKey
                          }
                          title={
                            project?.projectName ||
                            "AI Code Preview"
                          }
                          srcDoc={
                            previewHtml
                          }
                          sandbox="allow-scripts allow-modals"
                          className="h-full w-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
                          <Eye
                            size={30}
                            className="text-slate-500"
                          />
                        </div>

                        <h3 className="text-lg font-semibold text-white">
                          Live Preview
                        </h3>

                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                          {project
                            ? isEnglish
                              ? "The project was generated, but it does not contain an HTML file that can be previewed directly."
                              : "Project berhasil dibuat, tetapi tidak memiliki file HTML yang dapat dipreview langsung."
                            : isEnglish
                            ? "Describe a web project and AI will build it here."
                            : "Jelaskan project web yang kamu inginkan dan AI akan membangunnya di sini."}
                        </p>

                        {project &&
                          !hasPreview && (
                            <div className="mt-5 flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                              <AlertCircle
                                size={14}
                              />

                              <span>
                                {isEnglish
                                  ? "No HTML preview entry was found."
                                  : "Entry HTML untuk preview tidak ditemukan."}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ==================================
                    SOURCE CODE VIEWER
                ================================== */}

                <div className="min-h-0 border-t border-slate-800 bg-[#080D1A]">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Code2
                        size={15}
                        className="shrink-0 text-cyan-400"
                      />

                      <span className="truncate text-xs font-semibold text-slate-400">
                        {selectedFile?.path ||
                          "Source Code"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedFile && !isEditing && (
                        <button
                          type="button"
                          onClick={
                            startEditing
                          }
                          className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                        >
                          <Pencil size={14} />

                          <span>
                            Edit
                          </span>
                        </button>
                      )}

                      {selectedFile && isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={
                              cancelEditing
                            }
                            className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                          >
                            <Undo2 size={14} />

                            <span>
                              {isEnglish
                                ? "Cancel"
                                : "Batal"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={
                              saveFileChanges
                            }
                            disabled={!editorDirty}
                            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Save size={14} />

                            <span>
                              {isEnglish
                                ? "Save Changes"
                                : "Simpan Perubahan"}
                            </span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={
                          copySelectedFile
                        }
                        disabled={!selectedFile}
                        className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {copied ? (
                          <>
                            <Check
                              size={14}
                            />

                            <span>
                              {isEnglish
                                ? "Copied"
                                : "Tersalin"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy
                              size={14}
                            />

                            <span>
                              {isEnglish
                                ? "Copy"
                                : "Salin"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="h-[calc(100%-45px)] overflow-auto p-4">
                    {selectedFile ? (
                      isEditing ? (
                        <textarea
                          value={
                            editingContent
                          }
                          onChange={(event) => {
                            const value =
                              event.target.value;

                            setEditingContent(
                              value
                            );

                            setEditorDirty(
                              value !== selectedFile.content
                            );
                          }}
                          spellCheck={false}
                          wrap="off"
                          autoFocus
                          className="h-full min-h-full w-full resize-none border-0 bg-transparent p-0 font-mono text-xs leading-6 text-slate-300 outline-none focus:ring-0"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-300">
                          {selectedFile.content}
                        </pre>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs text-slate-600">
                        {isEnglish
                          ? "Select a generated file to inspect its source code."
                          : "Pilih file hasil AI untuk melihat source code-nya."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

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