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

const featureFilters = [
  {
    value: "All",
    id: "Semua",
    en: "All",
  },
  {
    value: "AI Debugger",
    id: "AI Debugger",
    en: "AI Debugger",
  },
  {
    value: "Image Prompt",
    id: "Image Prompt",
    en: "Image Prompt",
  },
  {
    value: "AI Design",
    id: "AI Design",
    en: "AI Design",
  },
  {
    value: "AI Animation",
    id: "AI Animation",
    en: "AI Animation",
  },
  {
    value: "AI Document",
    id: "AI Document",
    en: "AI Document",
  },
  {
    value: "AI OCR",
    id: "AI OCR",
    en: "AI OCR",
  },
  {
    value: "AI Translator",
    id: "AI Translator",
    en: "AI Translator",
  },
];

export default function HistoryPage() {
  const { locale } = useLanguage();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [selected, setSelected] =
    useState<HistoryItem | null>(null);

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
          .includes(searchValue);

      const matchFilter =
        filter === "All" ||
        item.feature === filter;

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

      if (selected?.id === id) {
        setSelected(null);
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

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      isIndonesia ? "id-ID" : "en-US",
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
              ? "Lihat seluruh aktivitas AI Anda."
              : "View every AI activity."}
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
                ? "Cari riwayat..."
                : "Search history..."
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

            {featureFilters.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {isIndonesia
                  ? item.id
                  : item.en}
              </option>
            ))}

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

          /* EMPTY */

          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-8 text-center lg:p-10">

            <History
              size={44}
              className="mx-auto mb-4 text-slate-600"
            />

            <h2 className="text-lg font-semibold text-white">
              {isIndonesia
                ? "Riwayat tidak ditemukan"
                : "No history found"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {isIndonesia
                ? "Aktivitas AI Anda akan muncul di sini."
                : "Your AI activities will appear here."}
            </p>

          </div>

        ) : (

          /* LIST */

          filtered.map((item) => (

            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg transition hover:border-slate-700 lg:p-5"
            >

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                {/* INFORMATION */}

                <div className="min-w-0 flex-1">

                  <h3 className="font-semibold text-white">
                    {item.feature}
                  </h3>

                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                    <Calendar size={15} />

                    <span>
                      {formatDate(
                        item.createdAt
                      )}
                    </span>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="flex justify-end gap-2">

                  {/* VIEW */}

                  <button
                    type="button"
                    onClick={() =>
                      setSelected(item)
                    }
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
                    className="rounded-lg bg-cyan-600 p-2 text-white transition hover:bg-cyan-500"
                  >
                    <Eye size={18} />
                  </button>

                  {/* COPY */}

                  <button
                    type="button"
                    onClick={() =>
                      copyText(item.prompt)
                    }
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
                    className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500"
                  >
                    <Copy size={18} />
                  </button>

                  {/* DELETE */}

                  <button
                    type="button"
                    onClick={() =>
                      deleteHistory(item.id)
                    }
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
                    className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-500"
                  >
                    <Trash2 size={18} />
                  </button>

                </div>

              </div>

              {/* PROMPT PREVIEW */}

              <p className="mt-4 line-clamp-2 break-words text-sm leading-6 text-slate-300 lg:text-base">
                {item.prompt}
              </p>

            </div>

          ))

        )}

      </div>

      {/* DETAIL MODAL */}

      {selected && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm lg:p-6"
          onClick={() =>
            setSelected(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl lg:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="mb-5 flex items-start justify-between gap-4 lg:mb-6">

              <div className="min-w-0">

                <h2 className="text-xl font-bold text-white lg:text-2xl">
                  {selected.feature}
                </h2>

                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                  <Calendar size={14} />

                  <span>
                    {formatDate(
                      selected.createdAt
                    )}
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

            {/* MODAL CONTENT */}

            <div className="space-y-5 lg:space-y-6">

              {/* PROMPT */}

              <div>

                <div className="mb-2 flex items-center justify-between gap-3">

                  <h3 className="text-base font-semibold text-cyan-400 lg:text-lg">
                    {isIndonesia
                      ? "Prompt"
                      : "Prompt"}
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
                    <Copy size={14} />

                    {isIndonesia
                      ? "Salin"
                      : "Copy"}
                  </button>

                </div>

                <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-300 lg:text-base">
                  {selected.prompt}
                </div>

              </div>

              {/* RESULT */}

              <div>

                <div className="mb-2 flex items-center justify-between gap-3">

                  <h3 className="text-base font-semibold text-cyan-400 lg:text-lg">
                    {isIndonesia
                      ? "Hasil"
                      : "Result"}
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        selected.result
                      )
                    }
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
                  >
                    <Copy size={14} />

                    {isIndonesia
                      ? "Salin"
                      : "Copy"}
                  </button>

                </div>

                {selected.feature === "AI Design" ? (
  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3">
    <img
      src={selected.result}
      alt="AI Design Result"
      className="mx-auto max-h-[700px] w-auto max-w-full rounded-lg object-contain"
    />
  </div>
) : (
  <div className="max-h-[500px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm leading-6 text-slate-300 lg:text-base">
    {selected.result}
  </div>
)}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}