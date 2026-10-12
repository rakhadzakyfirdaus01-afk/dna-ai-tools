"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  FileCode2,
  Bot,
  Play,
  RotateCcw,
  Copy,
  Check,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
  Globe,
  ShieldCheck,
  Loader2,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

export type TerminalLog = {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: number;
};

interface AntigravityAuxiliaryPaneProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: "terminal" | "artifacts" | "subagents";
  onTabChange?: (tab: "terminal" | "artifacts" | "subagents") => void;
  activeArtifact?: string;
  activeArtifactTitle?: string;
  artifactsContent?: string;
  artifactsTitle?: string;
  onRunTerminalCommand?: (cmd: string) => void;
  pendingCommand?: string;
  activeTaskId?: string;
}

export function AntigravityAuxiliaryPane({
  isOpen,
  onClose,
  activeTab: initialTab = "terminal",
  onTabChange,
  activeArtifact = "",
  activeArtifactTitle = "Generated Artifact",
  artifactsContent = "",
  artifactsTitle = "Generated Artifact",
  onRunTerminalCommand,
  pendingCommand = "",
  activeTaskId = "",
}: AntigravityAuxiliaryPaneProps) {
  const [tab, setTab] = useState<"terminal" | "artifacts" | "subagents">(initialTab);

  const currentTab = initialTab || tab;
  const setEffectiveTab = (newTab: "terminal" | "artifacts" | "subagents") => {
    setTab(newTab);
    onTabChange?.(newTab);
  };
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalRunning, setTerminalRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    {
      id: "init-1",
      command: "node -v",
      stdout: "v20.19.1",
      stderr: "",
      exitCode: 0,
      timestamp: Date.now() - 60000,
    },
    {
      id: "init-2",
      command: "git status -s",
      stdout: "## main...origin/main\nAntigravity Agentic Sandbox: Connected and clean.",
      stderr: "",
      exitCode: 0,
      timestamp: Date.now() - 30000,
    },
  ]);
  const [copiedArtifact, setCopiedArtifact] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const executedPendingRef = useRef<string>("");

  // Live Task Monitor State
  const [liveTask, setLiveTask] = useState<{
    taskId: string;
    status: string;
    goal: string;
    subtasks: any[];
    verificationEvidence?: any;
    finalReport?: string;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!activeTaskId) return;
    let isMounted = true;
    const fetchTask = async () => {
      try {
        const res = await fetch(`/api/antigravity/orchestrate?taskId=${encodeURIComponent(activeTaskId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setLiveTask(data);
        }
      } catch {}
    };
    fetchTask();
    const interval = setInterval(fetchTask, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeTaskId]);

  const handleCancelTask = async () => {
    if (!liveTask?.taskId) return;
    setIsCancelling(true);
    try {
      const res = await fetch("/api/antigravity/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", taskId: liveTask.taskId }),
      });
      if (res.ok) {
        setLiveTask((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      }
    } catch {} finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (pendingCommand && pendingCommand !== executedPendingRef.current) {
      executedPendingRef.current = pendingCommand;
      setTab("terminal");
      handleExecuteTerminal(pendingCommand);
    }
  }, [pendingCommand]);

  useEffect(() => {
    if (tab === "terminal") {
      terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, tab]);

  async function handleExecuteTerminal(commandToRun?: string) {
    let cmd = (commandToRun || terminalInput).trim();
    if (!cmd || terminalRunning) return;

    // Bersihkan prefix jika pengguna tidak sengaja copy-paste bersamaan dengan 'PS >' atau '> '
    if (cmd.startsWith("PS >")) {
      cmd = cmd.replace(/^PS\s*>\s*/, "").trim();
    } else if (cmd.startsWith("PS>")) {
      cmd = cmd.replace(/^PS>\s*/, "").trim();
    } else if (cmd.startsWith("$ ")) {
      cmd = cmd.replace(/^\$\s*/, "").trim();
    } else if (cmd.startsWith("> ")) {
      cmd = cmd.replace(/^>\s*/, "").trim();
    }

    // Jika pengguna copy-paste output multi-baris sekaligus, ambil hanya baris perintah pertamanya
    if (cmd.includes("\n")) {
      const firstLine = cmd.split("\n")[0].trim();
      if (firstLine) {
        cmd = firstLine.replace(/^(PS\s*>\s*|PS>\s*|\$\s*|>\s*)/, "").trim();
      }
    }

    if (!cmd) return;

    setTerminalRunning(true);
    setTerminalInput("");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            command: cmd,
            stdout: "",
            stderr: data.error || "Execution failed",
            exitCode: 1,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      setTerminalLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cmd,
          stdout: data.stdout || "",
          stderr: data.stderr || "",
          exitCode: data.exitCode ?? 0,
          timestamp: Date.now(),
        },
      ]);

      if (onRunTerminalCommand) {
        onRunTerminalCommand(cmd);
      }
    } catch (err) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cmd,
          stdout: "",
          stderr: err instanceof Error ? err.message : "Network error connecting to terminal sandbox",
          exitCode: 1,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setTerminalRunning(false);
    }
  }

  const copyArtifactToClipboard = async () => {
    if (!artifactsContent) return;
    try {
      await navigator.clipboard.writeText(artifactsContent);
      setCopiedArtifact(true);
      setTimeout(() => setCopiedArtifact(false), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <aside className="flex flex-col h-full w-full lg:w-[480px] xl:w-[540px] shrink-0 border-l border-border bg-slate-950/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300">
      {/* ========================================================
          PANE HEADER WITH TABS
      ======================================================== */}
      <div className="flex items-center justify-between border-b border-border/80 bg-slate-900/80 px-3 py-2 select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEffectiveTab("terminal")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              tab === "terminal"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Terminal size={14} className={tab === "terminal" ? "text-cyan-400" : ""} />
            <span>Terminal</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setEffectiveTab("artifacts")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              tab === "artifacts"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileCode2 size={14} className={tab === "artifacts" ? "text-indigo-400" : ""} />
            <span>Artifacts</span>
            {(artifactsContent || activeArtifact) && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />}
          </button>

          <button
            type="button"
            onClick={() => setEffectiveTab("subagents")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              tab === "subagents"
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Bot size={14} className={tab === "subagents" ? "text-violet-400" : ""} />
            <span>Subagents</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {tab === "terminal" && (
            <button
              type="button"
              onClick={() => setTerminalLogs([])}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
              title="Clear Terminal Output"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
            title="Tutup Pane"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: TERMINAL SANDBOX
      ======================================================== */}
      {tab === "terminal" && (
        <div className="flex flex-col flex-1 overflow-hidden bg-[#090d16] font-mono text-xs">
          {/* Quick Terminal Command Pills */}
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-900/40 px-3 py-1.5 overflow-x-auto custom-scrollbar">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Presets:</span>
            {["git status", "dir", "node -v", "git log -5 --oneline", "npm list --depth=0"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleExecuteTerminal(preset)}
                className="shrink-0 rounded-md border border-slate-800 bg-slate-800/60 hover:bg-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Terminal Logs Output */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar text-slate-200">
            <div className="text-slate-500 text-[11px] select-none border-b border-slate-800/60 pb-2">
              Google Antigravity Interactive Sandbox Terminal [v2.0]
              <br />
              Environment: PowerShell (Windows) • Workspace Root
            </div>

            {terminalLogs.map((log) => (
              <div key={log.id} className="space-y-1">
                {/* Command Line */}
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="text-slate-500 select-none">PS &gt;</span>
                  <span>{log.command}</span>
                  <span
                    className={`ml-auto text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      log.exitCode === 0
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    exit {log.exitCode}
                  </span>
                </div>

                {/* Stdout Output */}
                {log.stdout && (
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                    {log.stdout}
                  </pre>
                )}

                {/* Stderr Output */}
                {log.stderr && (
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-red-400 bg-red-950/20 p-2 rounded-lg border border-red-900/40">
                    {log.stderr}
                  </pre>
                )}
              </div>
            ))}

            {terminalRunning && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="animate-pulse">Menjalankan perintah di sandbox...</span>
              </div>
            )}

            <div ref={terminalBottomRef} />
          </div>

          {/* Terminal Prompt Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteTerminal();
            }}
            className="flex items-center gap-2 border-t border-slate-800 bg-[#0d131f] p-2.5"
          >
            <span className="text-cyan-400 font-bold select-none text-xs">PS &gt;</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              placeholder="Ketik perintah terminal (e.g. dir, git status, npm run build)..."
              disabled={terminalRunning}
              className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 font-mono disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!terminalInput.trim() || terminalRunning}
              className="flex items-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 text-xs font-semibold transition disabled:opacity-40"
            >
              <Play size={11} fill="currentColor" />
              <span>Run</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 2: ARTIFACTS & CANVAS
      ======================================================== */}
      {tab === "artifacts" && (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-950 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{artifactsTitle}</h3>
              <p className="text-xs text-slate-400">Antigravity Live Canvas</p>
            </div>
            {artifactsContent && (
              <button
                type="button"
                onClick={copyArtifactToClipboard}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
              >
                {copiedArtifact ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Salin</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 font-mono text-xs leading-relaxed text-slate-200 custom-scrollbar">
            {(activeArtifact || artifactsContent) ? (
              <pre className="whitespace-pre-wrap">{activeArtifact || artifactsContent}</pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12">
                <FileCode2 size={40} className="mb-3 text-slate-600" />
                <p className="font-semibold text-slate-400 text-sm">Belum Ada Artifact Aktif</p>
                <p className="text-xs mt-1 max-w-xs">
                  Minta AI untuk merancang arsitektur atau membuat kode, artifact akan langsung muncul di sini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: SUBAGENTS ORCHESTRATION & TASK DAG MONITOR
      ======================================================== */}
      {tab === "subagents" && (
        <div className="flex flex-col flex-1 overflow-y-auto bg-slate-950 p-4 space-y-3 custom-scrollbar">
          <div className="border-b border-slate-800 pb-2 mb-1 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Antigravity Autonomous Subagents</h3>
              <p className="text-xs text-slate-400">Koordinasi & monitor kolaborasi multi-agent</p>
            </div>
            {liveTask && (liveTask.status === "running" || liveTask.status === "queued") && (
              <button
                type="button"
                onClick={handleCancelTask}
                disabled={isCancelling}
                className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
              >
                {isCancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                <span>Batal Tugas</span>
              </button>
            )}
          </div>

          {/* MONITOR LIVE TASK DAG JIKA ADA TASK BERJALAN */}
          {liveTask && (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-cyan-300 font-bold">
                  TASK: {liveTask.taskId}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    liveTask.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : liveTask.status === "running"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                      : liveTask.status === "failed"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-slate-500/20 text-slate-300 border-slate-500/40"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span>{liveTask.status.toUpperCase()}</span>
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium line-clamp-2">{liveTask.goal}</p>

              {/* DAFTAR SUBTASK DAG */}
              {liveTask.subtasks && liveTask.subtasks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Alur Kerja Multi-Agent (DAG Milestones)
                  </p>
                  {liveTask.subtasks.map((sub: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                            #{sIdx + 1} [{sub.subagentRole?.toUpperCase() || "AGENT"}]
                          </span>
                          <span className="text-white font-medium">{sub.title}</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            sub.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : sub.status === "in_progress"
                              ? "bg-amber-500/20 text-amber-300 animate-pulse"
                              : sub.status === "failed"
                              ? "bg-rose-500/20 text-rose-400"
                              : sub.status === "blocked"
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      {sub.dependencies && sub.dependencies.length > 0 && (
                        <p className="text-[10px] text-slate-400">
                          Prasyarat: {sub.dependencies.join(", ")}
                        </p>
                      )}
                      {sub.outputEvidence?.summary && (
                        <p className="text-[11px] text-slate-300 mt-1 pl-2 border-l-2 border-emerald-500/40">
                          {sub.outputEvidence.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Direktori Spesialis Agent (Standby Roster)
            </p>
          </div>

          {[
            {
              role: "Architect & Planner",
              name: "Architect Agent",
              desc: "Merancang arsitektur sistem, memetakan dependensi, dan menyusun milestone DAG.",
              status: "Ready",
              icon: Layers,
              color: "text-cyan-400",
              bgColor: "bg-cyan-500/10",
              borderColor: "border-cyan-500/30",
            },
            {
              role: "Principal Code Specialist",
              name: "Coder Agent",
              desc: "Menghasilkan implementasi kode turn-key kelas produksi tanpa TODO.",
              status: "Ready",
              icon: FileCode2,
              color: "text-emerald-400",
              bgColor: "bg-emerald-500/10",
              borderColor: "border-emerald-500/30",
            },
            {
              role: "QA & Diagnostic Debugger",
              name: "QA Healer Agent",
              desc: "Deteksi bug runtime, typecheck compile, pengujian regressi, dan verifikasi build.",
              status: "Ready",
              icon: Cpu,
              color: "text-indigo-400",
              bgColor: "bg-indigo-500/10",
              borderColor: "border-indigo-500/30",
            },
            {
              role: "Security & Permission Auditor",
              name: "Security Gatekeeper",
              desc: "Proteksi kredensial (.env, .git), pencegahan path traversal, dan filter perintah berbahaya.",
              status: "Ready",
              icon: ShieldCheck,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10",
              borderColor: "border-purple-500/30",
            },
            {
              role: "Browser Automation & Visual QA",
              name: "Browser Agent",
              desc: "Otomasi headless browser, inspeksi struktur DOM, dan bukti visual layout screenshot.",
              status: "Ready",
              icon: Globe,
              color: "text-pink-400",
              bgColor: "bg-pink-500/10",
              borderColor: "border-pink-500/30",
            },
            {
              role: "Terminal Sandbox Runner",
              name: "Terminal Agent",
              desc: "Eksekusi perintah terminal live, build, uji coba, dan inspeksi environment.",
              status: terminalRunning ? "Running" : "Ready",
              icon: Terminal,
              color: "text-amber-400",
              bgColor: "bg-amber-500/10",
              borderColor: "border-amber-500/30",
            },
          ].map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl border ${agent.borderColor} ${agent.bgColor} p-3.5 shadow-sm transition hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-black/30 ${agent.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                      <p className="text-[10px] text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      agent.status === "Running"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        agent.status === "Running" ? "bg-amber-400 animate-ping" : "bg-emerald-400"
                      }`}
                    />
                    <span>{agent.status}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">{agent.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
