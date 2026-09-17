"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History,
  Search,
  Copy,
  Trash2,
  Eye,
  Calendar,
  Filter,
  X,
  Download,
  Code2,
  FileCode2,
  FolderOpen,
  Layers3,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/shared/language-provider";

type HistoryItem = {
  id: string;
  feature: string;
  prompt: string;
  result: string;
  createdAt: string;
};

type AIProjectFile = {
  path: string;
  content: string;
};

type AIProject = {
  projectName: string;
  type: "web" | "game" | "software";
  description: string;
  files: AIProjectFile[];
  mode?: string;
};

const featureFilters = [
  {
    value: "All",
    id: "Semua",
    en: "All",
  },
  {
    value: "AI Code",
    id: "AI Code",
    en: "AI Code",
  },
  {
    value: "AI Asisten",
    id: "AI Asisten",
    en: "AI Assistant",
  },
  {
    value: "AI Design",
    id: "Desain AI",
    en: "AI Design",
  },
  {
    value: "AI Animation",
    id: "Animasi AI",
    en: "AI Animation",
  },
];

function parseAIProject(result: string): AIProject | null {
  if (!result || typeof result !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(result);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const projectData =
      "project" in parsed &&
      parsed.project &&
      typeof parsed.project === "object" &&
      !Array.isArray(parsed.project)
        ? (parsed.project as Record<string, unknown>)
        : (parsed as Record<string, unknown>);

    const rawProjectName = projectData.projectName;
    const rawDescription = projectData.description;
    const rawFiles = projectData.files;

    if (
      typeof rawProjectName !== "string" ||
      !rawProjectName.trim() ||
      !Array.isArray(rawFiles)
    ) {
      return null;
    }

    const rawType =
      typeof projectData.type === "string"
        ? projectData.type.toLowerCase()
        : "web";

    const type: AIProject["type"] =
      rawType === "game"
        ? "game"
        : rawType === "software"
        ? "software"
        : "web";

    const files = rawFiles.filter(
      (file: unknown): file is AIProjectFile =>
        Boolean(file) &&
        typeof file === "object" &&
        typeof (file as AIProjectFile).path === "string" &&
        typeof (file as AIProjectFile).content === "string"
    );

    const rawMode =
      typeof (parsed as Record<string, unknown>).mode === "string"
        ? (parsed as Record<string, unknown>).mode
        : typeof projectData.mode === "string"
        ? projectData.mode
        : undefined;

    return {
      projectName: rawProjectName.trim(),
      type,
      description:
        typeof rawDescription === "string"
          ? rawDescription.trim()
          : "",
      files,
      mode:
        typeof rawMode === "string" && rawMode.trim()
          ? rawMode.trim()
          : undefined,
    };
  } catch {
    return null;
  }
}

function getProjectTypeLabel(
  type: AIProject["type"],
  isIndonesia: boolean
) {
  if (type === "web") {
    return isIndonesia ? "Web" : "Web";
  }

  if (type === "game") {
    return isIndonesia ? "Game" : "Game";
  }

  return isIndonesia ? "Software" : "Software";
}

function getProjectModeLabel(
  mode: string | undefined,
  isIndonesia: boolean
) {
  if (!mode) {
    return isIndonesia ? "Build" : "Build";
  }

  const normalized = mode.toLowerCase();

  if (
    normalized.includes("regenerate") ||
    normalized.includes("modify")
  ) {
    return isIndonesia ? "Regenerate" : "Regenerate";
  }

  return isIndonesia ? "Build" : "Build";
}

export default function HistoryPage() {
  const { locale } = useLanguage();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [selected, setSelected] =
    useState<HistoryItem | null>(null);

  const [activeProjectFile, setActiveProjectFile] =
    useState<AIProjectFile | null>(null);

  const [copiedFile, setCopiedFile] = useState(false);

  const [downloadingZip, setDownloadingZip] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const isIndonesia = locale === "id";

  async function loadHistory() {
    try {
      setLoading(true);

      const res = await fetch("/api/history");

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (isIndonesia
              ? "Gagal memuat riwayat"
              : "Failed to load history")
        );
      }

      setItems(data.history ?? []);
    } catch (error) {
      console.error(error);

      toast.error(
        isIndonesia
          ? "Gagal memuat riwayat."
          : "Failed to load history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    const searchValue = search
      .toLowerCase()
      .trim();

    return items.filter((item) => {
      const aiProject = parseAIProject(item.result);

      const projectSearchText = aiProject
        ? [
            aiProject.projectName,
            aiProject.type,
            aiProject.description,
            aiProject.mode ?? "",
            ...aiProject.files.map(
              (file) => file.path
            ),
          ]
            .join(" ")
            .toLowerCase()
        : "";

      const matchSearch =
        !searchValue ||
        item.prompt
          .toLowerCase()
          .includes(searchValue) ||
        item.result
          .toLowerCase()
          .includes(searchValue) ||
        item.feature
          .toLowerCase()
          .includes(searchValue) ||
        projectSearchText.includes(searchValue);

      const aiAssistantFeatures = [
        "AI Asisten",
        "AI Assistant",
        "AI Tech Assistant",
        "AI Debugger",
        "Image Prompt",
        "AI Document",
        "AI OCR",
        "AI Translator",
      ];

      const matchFilter =
        filter === "All" ||
        (filter === "AI Asisten"
          ? aiAssistantFeatures.includes(item.feature)
          : item.feature === filter);

      return matchSearch && matchFilter;
    });
  }, [items, search, filter]);

  async function deleteHistory(id: string) {
    try {
      const res = await fetch(
        `/api/history/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (isIndonesia
              ? "Gagal menghapus riwayat"
              : "Failed to delete history")
        );
      }

      setItems((prev) =>
        prev.filter((item) => item.id !== id)
      );

      try {
        window.localStorage.removeItem(
          getConversationStorageKey(id)
        );
      } catch (error) {
        console.error(
          "Failed to remove saved history conversation:",
          error
        );
      }

      if (selected?.id === id) {
        setSelected(null);
        setChatMessages([]);
        setChatInput("");
      }

      toast.success(
        isIndonesia
          ? "Riwayat berhasil dihapus."
          : "History deleted."
      );
    } catch (error) {
      console.error(error);

      toast.error(
        isIndonesia
          ? "Gagal menghapus riwayat."
          : "Failed to delete history."
      );
    }
  }

  async function copyText(text: string) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);

      toast.success(
        isIndonesia
          ? "Berhasil disalin."
          : "Copied."
      );
    } catch (error) {
      console.error(error);

      toast.error(
        isIndonesia
          ? "Gagal menyalin."
          : "Failed to copy."
      );
    }
  }

  async function copyFileCode(content: string) {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(true);

      toast.success(
        isIndonesia
          ? "Kode berhasil disalin!"
          : "Code copied successfully!"
      );

      window.setTimeout(() => {
        setCopiedFile(false);
      }, 2000);
    } catch {
      toast.error(
        isIndonesia
          ? "Gagal menyalin kode."
          : "Failed to copy code."
      );
    }
  }

  async function downloadHistoryProject(aiProject: AIProject) {
    if (!aiProject || !Array.isArray(aiProject.files) || aiProject.files.length === 0) {
      return;
    }

    try {
      setDownloadingZip(true);

      const response = await fetch("/api/ai-code/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName: aiProject.projectName,
          files: aiProject.files,
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${aiProject.projectName || "ai-project"}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        isIndonesia
          ? "Project ZIP berhasil diunduh!"
          : "Project ZIP downloaded successfully!"
      );
    } catch {
      toast.error(
        isIndonesia
          ? "Gagal mengunduh project ZIP."
          : "Failed to download project ZIP."
      );
    } finally {
      setDownloadingZip(false);
    }
  }

  function getConversationStorageKey(id: string) {
    return `dna-ai-history-conversation:${id}`;
  }

  function openConversation(item: HistoryItem) {
    setSelected(item);
    setChatInput("");
    setCopiedFile(false);

    if (item.feature === "AI Design") {
      setChatMessages([]);
      setActiveProjectFile(null);
      return;
    }

    if (item.feature === "AI Code") {
      setChatMessages([]);
      const project = parseAIProject(item.result);
      setActiveProjectFile(project?.files[0] ?? null);
      return;
    }

    try {
      const saved = window.localStorage.getItem(
        getConversationStorageKey(item.id)
      );

      if (saved) {
        const parsed = JSON.parse(saved);

        if (
          Array.isArray(parsed) &&
          parsed.every(
            (message) =>
              message &&
              (message.role === "user" ||
                message.role === "assistant") &&
              typeof message.content === "string"
          )
        ) {
          setChatMessages(parsed);
          return;
        }
      }
    } catch (error) {
      console.error(
        "Failed to restore history conversation:",
        error
      );
    }

    setChatMessages([
      {
        role: "user",
        content: item.prompt,
      },
      {
        role: "assistant",
        content: item.result,
      },
    ]);
  }

  function persistConversationMessages(
    historyId: string,
    messages: {
      role: "user" | "assistant";
      content: string;
    }[]
  ) {
    try {
      window.localStorage.setItem(
        getConversationStorageKey(historyId),
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error(
        "Failed to persist history conversation:",
        error
      );
    }
  }

  async function sendConversationMessage() {
    const message = chatInput.trim();

    if (
      !message ||
      chatLoading ||
      !selected
    ) {
      return;
    }

    const previousMessages = [
      ...chatMessages,
    ];

    const nextMessages = [
      ...previousMessages,
      {
        role: "user" as const,
        content: message,
      },
    ];

    setChatMessages(nextMessages);

    persistConversationMessages(
      selected.id,
      nextMessages
    );

    setChatInput("");
    setChatLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        "message",
        message
      );

      formData.append(
        "model",
        "gemini-3.6-flash"
      );

      formData.append(
        "locale",
        locale
      );

      formData.append(
        "conversation",
        nextMessages
          .map(
            (entry) =>
              `${
                entry.role === "user"
                  ? "User"
                  : "AI"
              }: ${entry.content}`
          )
          .join("\n\n")
      );

      const response = await fetch(
        "/api/ai-assistant",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isIndonesia
              ? "Gagal menghubungi AI."
              : "Failed to contact AI.")
        );
      }

      setChatMessages((prev) => {
        const updatedMessages = [
          ...prev,
          {
            role: "assistant" as const,
            content:
              data.result ||
              (isIndonesia
                ? "AI tidak memberikan jawaban."
                : "The AI did not return a response."),
          },
        ];

        persistConversationMessages(
          selected.id,
          updatedMessages
        );

        return updatedMessages;
      });
    } catch (error) {
      console.error(error);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : isIndonesia
                ? "Terjadi kesalahan saat menghubungi AI."
                : "An error occurred while contacting AI.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      isIndonesia
        ? "id-ID"
        : "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">

      {/* HEADER */}

      <div className="flex items-start gap-3 lg:items-center">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 lg:h-14 lg:w-14">
          <History
            size={28}
            className="text-cyan-400"
          />
        </div>

        <div>

          <h1 className="text-2xl font-bold text-white lg:text-3xl">
            {isIndonesia
              ? "Riwayat"
              : "History"}
          </h1>

          <p className="text-sm text-slate-400 lg:text-base">
            {isIndonesia
              ? "Buka kembali percakapan AI Anda."
              : "Open your AI conversations again."}
          </p>

        </div>

      </div>

      {/* SEARCH & FILTER */}

      <div className="grid gap-3 md:grid-cols-2 lg:gap-4">

        {/* SEARCH */}

        <div className="relative">

          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder={
              isIndonesia
                ? "Cari percakapan..."
                : "Search conversations..."
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
          />

        </div>

        {/* FILTER */}

        <div className="relative">

          <Filter
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900 py-3 pl-11 pr-4 text-white outline-none transition focus:border-cyan-500"
          >

            {featureFilters.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {isIndonesia
                    ? item.id
                    : item.en}
                </option>
              )
            )}

          </select>

        </div>

      </div>

      {/* HISTORY LIST */}

      <div className="space-y-3 lg:space-y-4">

        {/* LOADING */}

        {loading ? (

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">

            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="text-sm text-slate-400">
              {isIndonesia
                ? "Memuat riwayat..."
                : "Loading history..."}
            </p>

          </div>

        ) : filtered.length === 0 ? (

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center lg:p-10">

            <History
              size={44}
              className="mx-auto mb-4 text-slate-600"
            />

            <h2 className="text-lg font-semibold text-white">
              {isIndonesia
                ? "Percakapan tidak ditemukan"
                : "No conversations found"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {isIndonesia
                ? "Aktivitas AI Anda akan muncul di sini."
                : "Your AI activities will appear here."}
            </p>

          </div>

        ) : (

          filtered.map((item) => {

            const aiProject =
              item.feature === "AI Code"
                ? parseAIProject(
                    item.result
                  )
                : null;

            return (
              <div
                key={item.id}
                className="group w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left shadow-lg transition hover:border-cyan-500/50 hover:bg-slate-800/80 lg:p-5"
              >

                <div className="flex items-start gap-3">

                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">

                    {item.feature ===
                    "AI Code" ? (
                      <Code2 size={18} />
                    ) : (
                      <History size={18} />
                    )}

                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h3 className="line-clamp-2 break-words text-base font-semibold text-white lg:text-lg">

                          {aiProject
                            ? aiProject.projectName
                            : item.prompt ||
                              (isIndonesia
                                ? "Percakapan tanpa judul"
                                : "Untitled conversation")}

                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                          <span className="rounded-md bg-slate-800 px-2 py-1 text-cyan-400">
                            {item.feature}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <Calendar
                              size={13}
                            />
                            {formatDate(
                              item.createdAt
                            )}
                          </span>

                        </div>

                      </div>

                      <span className="shrink-0 text-xs font-medium text-slate-600 transition group-hover:text-cyan-400">
                        {isIndonesia
                          ? "Buka"
                          : "Open"}
                      </span>

                    </div>

                    {aiProject ? (

                      <div className="mt-3 space-y-3">

                        <p className="line-clamp-2 break-words text-sm leading-6 text-slate-400">
                          {aiProject.description ||
                            (isIndonesia
                              ? "Tidak ada deskripsi project."
                              : "No project description.")}
                        </p>

                        <div className="flex flex-wrap gap-2">

                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400">
                            <Layers3
                              size={13}
                            />
                            {aiProject.files.length}{" "}
                            {isIndonesia
                              ? "file"
                              : "files"}
                          </span>

                          <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-400">
                            {getProjectTypeLabel(
                              aiProject.type,
                              isIndonesia
                            )}
                          </span>

                          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1.5 text-xs text-cyan-400">
                            {getProjectModeLabel(
                              aiProject.mode,
                              isIndonesia
                            )}
                          </span>

                        </div>

                      </div>

                    ) : (

                      <p className="mt-3 line-clamp-2 break-words text-sm leading-6 text-slate-400">
                        {item.result || (
                          isIndonesia
                            ? "Belum ada hasil."
                            : "No result available."
                        )}
                      </p>

                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">

                      <span className="text-xs text-slate-600">
                        {isIndonesia
                          ? "Gunakan tombol lihat untuk membuka detail"
                          : "Use the view button to open details"}
                      </span>

                      <span className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            openConversation(
                              item
                            )
                          }
                          className="rounded-lg bg-cyan-600/90 p-2 text-white transition hover:bg-cyan-500"
                          title={
                            isIndonesia
                              ? "Lihat"
                              : "View"
                          }
                          aria-label={
                            isIndonesia
                              ? "Lihat riwayat"
                              : "View history"
                          }
                        >
                          <Eye
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              item.prompt
                            )
                          }
                          className="rounded-lg bg-blue-600/90 p-2 text-white transition hover:bg-blue-500"
                          title={
                            isIndonesia
                              ? "Salin prompt"
                              : "Copy prompt"
                          }
                          aria-label={
                            isIndonesia
                              ? "Salin prompt"
                              : "Copy prompt"
                          }
                        >
                          <Copy
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteHistory(
                              item.id
                            )
                          }
                          className="rounded-lg bg-red-600/90 p-2 text-white transition hover:bg-red-500"
                          title={
                            isIndonesia
                              ? "Hapus"
                              : "Delete"
                          }
                          aria-label={
                            isIndonesia
                              ? "Hapus riwayat"
                              : "Delete history"
                          }
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </span>

                    </div>

                  </div>

                </div>

              </div>
            );
          })

        )}

      </div>

      {/* DETAIL MODAL */}

      {selected && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4 lg:p-6"
          onClick={() =>
            setSelected(null)
          }
        >

          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* FEATURE HEADER */}

            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-4 lg:px-6">

              <div className="min-w-0">

                <h2 className="truncate text-lg font-bold text-white lg:text-2xl">

                  {selected.feature ===
                  "AI Design"
                    ? "AI Design"
                    : selected.feature ===
                        "AI Code"
                      ? parseAIProject(
                          selected.result
                        )?.projectName ||
                        "AI Code"
                      : selected.prompt ||
                        (isIndonesia
                          ? "Percakapan"
                          : "Conversation")}

                </h2>

                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 lg:text-sm">

                  <Calendar
                    size={14}
                  />

                  <span>
                    {formatDate(
                      selected.createdAt
                    )}
                  </span>

                  <span>•</span>

                  <span>
                    {selected.feature}
                  </span>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                title={
                  isIndonesia
                    ? "Tutup"
                    : "Close"
                }
                aria-label={
                  isIndonesia
                    ? "Tutup"
                    : "Close"
                }
                className="shrink-0 rounded-lg bg-slate-800 p-2 text-slate-300 transition hover:bg-red-600 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>

            {selected.feature ===
            "AI Code" ? (

              /* =====================================================
                 AI CODE DETAIL
                 ===================================================== */

              (() => {

                const aiProject =
                  parseAIProject(
                    selected.result
                  );

                if (!aiProject) {
                  return (
                    <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">

                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">

                        <h3 className="text-base font-semibold text-red-400">
                          {isIndonesia
                            ? "Data project tidak dapat dibaca"
                            : "Project data could not be read"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {isIndonesia
                            ? "Hasil AI Code tersimpan dalam format lama atau tidak sesuai format project."
                            : "The AI Code result is stored in an older format or does not match the project format."}
                        </p>

                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

                          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-400">
                            {selected.result}
                          </pre>

                        </div>

                      </div>

                    </div>
                  );
                }

                return (
                  <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">

                    <div className="space-y-5 lg:space-y-6">

                      {/* PROJECT OVERVIEW */}

                      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 lg:p-5">

                        <div className="flex items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">

                            <Code2
                              size={21}
                            />

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                              AI Code Project
                            </p>

                            <h3 className="mt-1 break-words text-xl font-bold text-white lg:text-2xl">
                              {
                                aiProject.projectName
                              }
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              {
                                aiProject.description ||
                                (isIndonesia
                                  ? "Tidak ada deskripsi project."
                                  : "No project description.")
                              }
                            </p>

                          </div>

                        </div>

                      </div>

                      {/* PROJECT INFORMATION */}

                      <div className="grid gap-3 sm:grid-cols-3">

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

                          <div className="flex items-center gap-2 text-xs text-slate-500">

                            <Layers3
                              size={14}
                            />

                            {isIndonesia
                              ? "Jumlah File"
                              : "Files"}

                          </div>

                          <p className="mt-2 text-lg font-bold text-white">
                            {
                              aiProject.files.length
                            }
                          </p>

                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

                          <div className="flex items-center gap-2 text-xs text-slate-500">

                            <FolderOpen
                              size={14}
                            />

                            {isIndonesia
                              ? "Tipe Project"
                              : "Project Type"}

                          </div>

                          <p className="mt-2 text-lg font-bold text-white">
                            {getProjectTypeLabel(
                              aiProject.type,
                              isIndonesia
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

                          <div className="flex items-center gap-2 text-xs text-slate-500">

                            <Code2
                              size={14}
                            />

                            {isIndonesia
                              ? "Mode"
                              : "Mode"}

                          </div>

                          <p className="mt-2 text-lg font-bold text-white">
                            {getProjectModeLabel(
                              aiProject.mode,
                              isIndonesia
                            )}
                          </p>

                        </div>

                      </div>

                      {/* PROMPT */}

                      <div>

                        <div className="mb-2 flex items-center justify-between gap-3">

                          <h3 className="text-base font-semibold text-cyan-400 lg:text-lg">
                            Prompt
                          </h3>

                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                selected.prompt
                              )
                            }
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                          >
                            <Copy
                              size={14}
                            />

                            {isIndonesia
                              ? "Salin"
                              : "Copy"}

                          </button>

                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-300 lg:text-base">
                          {selected.prompt || (
                            isIndonesia
                              ? "Tidak ada prompt."
                              : "No prompt."
                          )}
                        </div>

                      </div>

                      {/* PROJECT FILES */}

                      <div>

                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

                          <div className="flex items-center gap-2">
                            <h3 className="flex items-center gap-2 text-base font-semibold text-cyan-400 lg:text-lg">
                              <FolderOpen size={18} />
                              {isIndonesia ? "Project Files" : "Project Files"}
                            </h3>

                            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                              {aiProject.files.length} {isIndonesia ? "file" : "files"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => downloadHistoryProject(aiProject)}
                            disabled={downloadingZip || aiProject.files.length === 0}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-700 hover:text-cyan-400 disabled:opacity-50"
                          >
                            <Download size={13} className={downloadingZip ? "animate-bounce" : ""} />
                            {downloadingZip
                              ? (isIndonesia ? "Mengunduh..." : "Downloading...")
                              : "Download ZIP"}
                          </button>

                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

                          {aiProject.files.length === 0 ? (

                            <div className="p-5 text-center text-sm text-slate-500">
                              {isIndonesia
                                ? "Tidak ada file project."
                                : "No project files."}
                            </div>

                          ) : (

                            <div className="divide-y divide-slate-800">

                              {aiProject.files.map((file, index) => {
                                const isCurrentActive =
                                  (activeProjectFile?.path || aiProject.files[0]?.path) === file.path;

                                return (
                                  <button
                                    key={`${file.path}-${index}`}
                                    type="button"
                                    onClick={() => setActiveProjectFile(file)}
                                    className={`group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                                      isCurrentActive
                                        ? "bg-cyan-500/10 text-cyan-300"
                                        : "hover:bg-slate-800/60 text-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <FileCode2
                                        size={17}
                                        className={`mt-0.5 shrink-0 transition ${
                                          isCurrentActive
                                            ? "text-cyan-400"
                                            : "text-slate-500 group-hover:text-cyan-400"
                                        }`}
                                      />

                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={`break-all font-mono text-sm font-medium ${
                                            isCurrentActive
                                              ? "text-cyan-200"
                                              : "text-slate-200"
                                          }`}
                                        >
                                          {file.path}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {file.content.split("\n").length} {isIndonesia ? "baris" : "lines"} • {file.content.length} {isIndonesia ? "karakter" : "characters"}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="shrink-0">
                                      {isCurrentActive ? (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300">
                                          <Eye size={12} />
                                          {isIndonesia ? "Dilihat" : "Viewing"}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-500 transition group-hover:text-cyan-400">
                                          {isIndonesia ? "Lihat kode →" : "View code →"}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}

                            </div>

                          )}

                        </div>

                        {/* CODE VIEWER CONTAINER */}
                        {(() => {
                          const currentFile =
                            activeProjectFile ?? (aiProject.files.length > 0 ? aiProject.files[0] : null);

                          if (!currentFile) return null;

                          return (
                            <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                              {/* Viewer Header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileCode2 size={16} className="text-cyan-400 shrink-0" />
                                  <span className="font-mono text-xs font-semibold text-white truncate">
                                    {currentFile.path}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    • {currentFile.content.split("\n").length} {isIndonesia ? "baris" : "lines"} ({currentFile.content.length} {isIndonesia ? "karakter" : "characters"})
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => copyFileCode(currentFile.content)}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
                                >
                                  {copiedFile ? (
                                    <>
                                      <Check size={13} className="text-green-400" />
                                      <span className="text-green-400">{isIndonesia ? "Tersalin!" : "Copied!"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={13} />
                                      <span>{isIndonesia ? "Salin Kode" : "Copy Code"}</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Viewer Content */}
                              <div className="max-h-[460px] overflow-auto p-4 bg-slate-950">
                                <pre className="whitespace-pre font-mono text-xs leading-6 text-slate-200 selection:bg-cyan-500/30">
                                  <code>{currentFile.content}</code>
                                </pre>
                              </div>
                            </div>
                          );
                        })()}

                      </div>

                    </div>

                  </div>
                );
              })()

            ) : selected.feature ===
              "AI Design" ? (

              /* =====================================================
                 AI DESIGN DETAIL
                 ===================================================== */

              <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">

                <div className="space-y-5 lg:space-y-6">

                  {/* PROMPT */}

                  <div>

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <h3 className="text-base font-semibold text-cyan-400 lg:text-lg">
                        Prompt
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            selected.prompt
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                      >

                        <Copy
                          size={14}
                        />

                        {isIndonesia
                          ? "Salin"
                          : "Copy"}

                      </button>

                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-300 lg:text-base">

                      {selected.prompt || (
                        isIndonesia
                          ? "Tidak ada prompt."
                          : "No prompt."
                      )}

                    </div>

                  </div>

                  {/* RESULT IMAGE */}

                  <div>

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <h3 className="text-base font-semibold text-cyan-400 lg:text-lg">
                        {isIndonesia
                          ? "Hasil"
                          : "Result"}
                      </h3>

                      {selected.result && (

                        <a
                          href={
                            selected.result
                          }
                          download="dna-ai-design.png"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-cyan-500"
                        >

                          <Download
                            size={14}
                          />

                          Download

                        </a>

                      )}

                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-3 lg:p-4">

                      {selected.result ? (

                        <img
                          src={
                            selected.result
                          }
                          alt={
                            isIndonesia
                              ? "Hasil AI Design"
                              : "AI Design Result"
                          }
                          className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl object-contain"
                        />

                      ) : (

                        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">

                          {isIndonesia
                            ? "Gambar hasil tidak tersedia."
                            : "Result image is not available."}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              </div>

            ) : (

              /* =====================================================
                 AI ASSISTANT DETAIL
                 ===================================================== */

              <>

                {/* CHAT MESSAGES */}

                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 lg:px-6 lg:py-6">

                  {chatMessages.map(
                    (
                      message,
                      index
                    ) => (

                      <div
                        key={`${message.role}-${index}`}
                        className={
                          message.role ===
                          "user"
                            ? "flex justify-end"
                            : "flex justify-start"
                        }
                      >

                        <div
                          className={
                            message.role ===
                            "user"
                              ? "max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm leading-6 text-white lg:max-w-[75%] lg:text-base"
                              : "max-w-[90%] rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-200 lg:max-w-[80%] lg:text-base"
                          }
                        >

                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">

                            {message.role ===
                            "user"
                              ? isIndonesia
                                ? "Anda"
                                : "You"
                              : "AI Assistant"}

                          </div>

                          <div className="whitespace-pre-wrap break-words">
                            {
                              message.content
                            }
                          </div>

                        </div>

                      </div>

                    )
                  )}

                  {chatLoading && (

                    <div className="flex justify-start">

                      <div className="rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">

                        {isIndonesia
                          ? "AI sedang mengetik..."
                          : "AI is typing..."}

                      </div>

                    </div>

                  )}

                </div>

                {/* CHAT COMPOSER */}

                <div className="border-t border-slate-800 bg-slate-950 p-3 lg:p-4">

                  <div className="flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 focus-within:border-cyan-500/60">

                    <textarea
                      value={
                        chatInput
                      }
                      onChange={(e) =>
                        setChatInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) => {

                        if (
                          e.key ===
                            "Enter" &&
                          !e.shiftKey
                        ) {

                          e.preventDefault();

                          sendConversationMessage();

                        }

                      }}
                      placeholder={
                        isIndonesia
                          ? "Kirim pesan..."
                          : "Send a message..."
                      }
                      disabled={
                        chatLoading
                      }
                      rows={1}
                      className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 lg:text-base"
                    />

                    <button
                      type="button"
                      onClick={
                        sendConversationMessage
                      }
                      disabled={
                        !chatInput.trim() ||
                        chatLoading
                      }
                      className="rounded-xl bg-cyan-600 p-3 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        isIndonesia
                          ? "Kirim"
                          : "Send"
                      }
                      aria-label={
                        isIndonesia
                          ? "Kirim pesan"
                          : "Send message"
                      }
                    >

                      <span className="text-sm font-semibold">
                        ➤
                      </span>

                    </button>

                  </div>

                  <p className="mt-2 px-1 text-[11px] text-slate-600">

                    {isIndonesia
                      ? "Enter untuk kirim • Shift+Enter untuk baris baru"
                      : "Enter to send • Shift+Enter for a new line"}

                  </p>

                </div>

              </>

            )}

          </div>

        </div>

      )}

    </div>
  );
}