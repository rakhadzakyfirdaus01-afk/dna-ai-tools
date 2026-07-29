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
} from "lucide-react";
import { toast } from "sonner";

type HistoryItem = {
  id: string;
  feature: string;
  prompt: string;
  result: string;
  createdAt: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  const [selected, setSelected] =
    useState<HistoryItem | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);

      const res = await fetch("/api/history");

      const data = await res.json();

      setItems(data.history ?? []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.prompt
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.result
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchFilter =
        filter === "All" ||
        item.feature === filter;

      return matchSearch && matchFilter;
    });
  }, [items, search, filter]);

  async function deleteHistory(id: string) {
    try {
      await fetch(`/api/history/${id}`, {
        method: "DELETE",
      });

      setItems((prev) =>
        prev.filter((item) => item.id !== id)
      );

      toast.success("Deleted");
    } catch {
      toast.error("Failed");
    }
  }

  function copyPrompt(prompt: string) {
    navigator.clipboard.writeText(prompt);

    toast.success("Copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">

        <History
          size={30}
          className="text-cyan-400"
        />

        <div>
          <h1 className="text-3xl font-bold text-white">
            History
          </h1>

          <p className="text-slate-400">
            View every AI activity.
          </p>
        </div>
      </div>
            <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search history..."
            className="w-full rounded-xl bg-slate-900 py-3 pl-11 pr-4 text-white outline-none"
          />
        </div>

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
            className="w-full rounded-xl bg-slate-900 py-3 pl-11 pr-4 text-white outline-none"
          >
            <option>All</option>
            <option>AI Debugger</option>
            <option>Image Prompt</option>
            <option>AI Design</option>
            <option>AI Animation</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl bg-slate-900 p-8 text-center text-slate-400">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl bg-slate-900 p-8 text-center text-slate-500">
            No history found.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                  <h3 className="font-semibold text-white">
                    {item.feature}
                  </h3>

                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={15} />
                    {new Date(
                      item.createdAt
                    ).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-2">

                  <button
                    onClick={() =>
                      setSelected(item)
                    }
                    className="rounded-lg bg-cyan-600 p-2 text-white"
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    onClick={() =>
                      copyPrompt(item.prompt)
                    }
                    className="rounded-lg bg-blue-600 p-2 text-white"
                  >
                    <Copy size={18} />
                  </button>

                  <button
                    onClick={() =>
                      deleteHistory(item.id)
                    }
                    className="rounded-lg bg-red-600 p-2 text-white"
                  >
                    <Trash2 size={18} />
                  </button>

                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-slate-300">
                {item.prompt}
              </p>
            </div>
          ))
        )}
      </div>
            {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-slate-950 p-6">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-2xl font-bold text-white">
                  {selected.feature}
                </h2>

                <p className="text-sm text-slate-500">
                  {new Date(
                    selected.createdAt
                  ).toLocaleString()}
                </p>

              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg bg-red-600 px-4 py-2 text-white"
              >
                Close
              </button>

            </div>

            <div className="space-y-6">

              <div>

                <h3 className="mb-2 text-lg font-semibold text-cyan-400">
                  Prompt
                </h3>

                <div className="whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-slate-300">
                  {selected.prompt}
                </div>

              </div>

              <div>

                <h3 className="mb-2 text-lg font-semibold text-cyan-400">
                  Result
                </h3>

                <div className="whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-slate-300">
                  {selected.result}
                </div>

              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}