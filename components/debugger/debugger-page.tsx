"use client";

import { useState } from "react";
import { Bug, Play, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DebuggerPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze() {
    if (!code.trim()) {
      toast.error("Please enter some code first!");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/debugger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data.result);

      toast.success("Analysis completed!");
    } catch (error) {
      console.error(error);

      toast.error("Analysis failed!");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setCode("");
    setResult("");
    toast.success("Cleared!");
  }

  function copyResult() {
    navigator.clipboard.writeText(result);
    toast.success("Copied!");
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-700 p-8">
        <div className="flex items-center gap-3">
          <Bug className="text-white" size={32} />

          <div>
            <h1 className="text-4xl font-bold text-white">
              AI Debugger
            </h1>

            <p className="mt-2 text-white/80">
              Analyze your source code.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-[#111827] p-6">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code..."
            className="h-[500px] w-full rounded-xl bg-slate-900 p-4 text-white outline-none"
          />

          <div className="mt-5 flex gap-3">
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={18} />
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            <button
              onClick={clearAll}
              disabled={!code && !result}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} />
              Clear
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111827] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              Result
            </h2>

            <button
              onClick={copyResult}
              disabled={!result}
              className="rounded-xl bg-slate-900 p-3 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy />
            </button>
          </div>

          <pre className="h-[500px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-4 text-slate-300">
            {result || "AI response will appear here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}