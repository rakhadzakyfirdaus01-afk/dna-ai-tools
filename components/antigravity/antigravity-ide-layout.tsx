"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  MessageSquare,
  Search,
  GitBranch,
  Terminal as TerminalIcon,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Play,
  RotateCw,
  Cpu,
  Layers,
  Wand2,
  BookOpen,
  PanelBottom,
  PanelBottomClose,
} from "lucide-react";
import { AntigravityTitlebar } from "./antigravity-titlebar";
import { AntigravityExplorer } from "./antigravity-explorer";
import { AntigravityEditor, type EditorTab } from "./antigravity-editor";

interface AntigravityIdeLayoutProps {
  children?: React.ReactNode; // Right agent chat pane or custom child
  workspaceName?: string;
  onRunTerminalCommand?: (cmd: string) => void;
}

export function AntigravityIdeLayout({
  children,
  workspaceName = "dna-workspace",
  onRunTerminalCommand,
}: AntigravityIdeLayoutProps) {
  // Navigation & View Modes
  const [activeActivity, setActiveActivity] = useState<"explorer" | "agent" | "search" | "git" | "skills">("explorer");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Editor Tabs State
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: "readme",
      title: "README.md",
      filePath: "README.md",
      type: "artifact",
      content: `# DNA AI — Antigravity 2.0 Autonomous IDE

Selamat datang di **DNA AI Antigravity Platform**, lingkungan pengembangan otonom bertenaga Gemini, Antigravity Orchestrator, dan Sandbox Terisolasi.

### ✨ Kemampuan Utama:
- **Autonomous Multi-Agent DAG**: Koordinasi agen spesialis (*Architect*, *Coder*, *QA Debugger*, *Security*, *Browser*).
- **Interactive Sandbox Terminal**: Lingkungan shell terisolasi dan aman untuk pengujian kode dan pembuatan file.
- **Codebase Intelligence**: Navigasi simbol, pencarian regex, dan modifikasi kode presisi (*patch_file*).
- **Security Gate Protection**: Proteksi otomatis dari *path traversal*, kebocoran kredensial, dan perintah berbahaya sistem.
- **Desktop Application Experience**: Tampilan dan performa desktop standalone mirip Microsoft Word atau VS Code.

> [!TIP]
> Gunakan shortcut slash commands seperti \`/plan\`, \`/goal\`, atau \`/boost\` di jendela Agent di sebelah kanan untuk memulai pekerjaan otonom!
`,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("readme");

  // Terminal State in Bottom Drawer
  const [terminalLogs, setTerminalLogs] = useState<Array<{ id: string; command: string; stdout: string; stderr: string; exitCode: number }>>([
    {
      id: "init-1",
      command: "node -v",
      stdout: "v20.19.1",
      stderr: "",
      exitCode: 0,
    },
    {
      id: "init-2",
      command: "git status -s",
      stdout: "## main...origin/main\nAntigravity Agentic Sandbox: Connected and clean.",
      stderr: "",
      exitCode: 0,
    },
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalRunning, setTerminalRunning] = useState(false);
  const [terminalActiveTab, setTerminalActiveTab] = useState<"terminal" | "output" | "problems">("terminal");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Open file in Editor
  const handleOpenFile = async (filePath: string) => {
    // Cek apakah tab sudah terbuka
    const existing = tabs.find((t) => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", filePath }),
      });
      const data = await res.json();
      if (data.success) {
        const newTab: EditorTab = {
          id: `file-${Date.now()}`,
          title: filePath.split("/").pop() || filePath,
          filePath,
          content: data.content || "",
          type: "code",
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    } catch (err) {
      console.error("Gagal membuka file:", err);
    }
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && next.length > 0) {
        setActiveTabId(next[next.length - 1].id);
      }
      return next;
    });
  };

  const handleUpdateContent = (tabId: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, content, isDirty: true } : t))
    );
  };

  const handleSaveFile = async (tabId: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || !tab.filePath) return false;

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "write",
          filePath: tab.filePath,
          content: tab.content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTabs((prev) =>
          prev.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t))
        );
        setRefreshTrigger((n) => n + 1);
        return true;
      }
    } catch {}
    return false;
  };

  // Run Terminal Command in Bottom Drawer
  const handleExecuteTerminal = async (customCmd?: string) => {
    const cmd = (customCmd || terminalInput).trim();
    if (!cmd) return;

    setTerminalRunning(true);
    if (!customCmd) setTerminalInput("");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      setTerminalLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cmd,
          stdout: data.stdout || "",
          stderr: data.stderr || (data.error ? data.error : ""),
          exitCode: data.exitCode ?? (res.ok ? 0 : 1),
        },
      ]);

      // Refresh file explorer jika ada berkas yang mungkin baru dibuat/diubah
      setRefreshTrigger((n) => n + 1);

      if (onRunTerminalCommand) {
        onRunTerminalCommand(cmd);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          command: cmd,
          stdout: "",
          stderr: err.message || "Gagal menghubungi sandbox terminal",
          exitCode: 1,
        },
      ]);
    } finally {
      setTerminalRunning(false);
      setTimeout(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-[#070a12] text-slate-200 overflow-hidden font-sans select-none">
      {/* 1. TOP WINDOW TITLEBAR (Desktop App Frame) */}
      <AntigravityTitlebar
        workspaceName={workspaceName}
        onToggleTerminal={() => setIsTerminalOpen((v) => !v)}
        onToggleExplorer={() => setIsSidebarOpen((v) => !v)}
        onNewFile={() => {
          setIsSidebarOpen(true);
          setActiveActivity("explorer");
        }}
        onRefreshWorkspace={() => setRefreshTrigger((n) => n + 1)}
      />

      {/* 2. MAIN WORKSPACE BODY */}
      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* ========================================================
            ACTIVITY BAR (Left vertical dock - 48px)
        ======================================================== */}
        <aside className="flex flex-col items-center justify-between w-12 border-r border-[#1a2336] bg-[#090d16] py-2 shrink-0 z-20">
          <div className="flex flex-col items-center gap-2">
            {/* Explorer Icon */}
            <button
              type="button"
              onClick={() => {
                if (activeActivity === "explorer" && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveActivity("explorer");
                  setIsSidebarOpen(true);
                }
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                activeActivity === "explorer" && isSidebarOpen
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Explorer (Files & Workspace)"
            >
              <Folder size={18} />
            </button>

            {/* Agent Chat Icon */}
            <button
              type="button"
              onClick={() => {
                if (activeActivity === "agent" && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveActivity("agent");
                  setIsSidebarOpen(true);
                }
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                activeActivity === "agent" && isSidebarOpen
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Antigravity Agent (Chat & Task History)"
            >
              <MessageSquare size={18} />
            </button>

            {/* Search Icon */}
            <button
              type="button"
              onClick={() => {
                if (activeActivity === "search" && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveActivity("search");
                  setIsSidebarOpen(true);
                }
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                activeActivity === "search" && isSidebarOpen
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Codebase Intelligence Search"
            >
              <Search size={18} />
            </button>

            {/* Skills & Plugins Icon */}
            <button
              type="button"
              onClick={() => {
                if (activeActivity === "skills" && isSidebarOpen) {
                  setIsSidebarOpen(false);
                } else {
                  setActiveActivity("skills");
                  setIsSidebarOpen(true);
                }
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                activeActivity === "skills" && isSidebarOpen
                  ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Antigravity Skills & Customizations"
            >
              <Wand2 size={18} />
            </button>

            {/* Terminal Drawer Toggle Icon */}
            <button
              type="button"
              onClick={() => setIsTerminalOpen((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                isTerminalOpen
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Toggle Bottom Terminal Drawer (Ctrl+`)"
            >
              <TerminalIcon size={18} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => alert("Antigravity Settings: Workspace sandboxed, Gemini Model 2.5, Strict security gate active.")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
              title="Settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </aside>

        {/* ========================================================
            PRIMARY SIDEBAR (Collapsible 260px-320px)
        ======================================================== */}
        {isSidebarOpen && (
          <aside className="w-64 sm:w-72 border-r border-[#1a2336] bg-[#0c121e] flex flex-col shrink-0 z-10 transition-all duration-200">
            {activeActivity === "explorer" && (
              <AntigravityExplorer
                onOpenFile={handleOpenFile}
                activeFilePath={tabs.find((t) => t.id === activeTabId)?.filePath}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeActivity === "skills" && (
              <div className="flex flex-col h-full bg-[#0d131f] text-xs p-3 space-y-3 overflow-y-auto custom-scrollbar">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                  Antigravity Skills
                </span>
                <div className="space-y-2">
                  {[
                    { name: "agy-customizations", desc: "Guide & reference for Antigravity rules, skills, plugins, and hooks.", badge: "Builtin" },
                    { name: "automation", desc: "Interactive guide to design and schedule recurring background automations.", badge: "Automation" },
                    { name: "generative_ui", desc: "Render rich interactive HTML widgets inline in chat or artifacts.", badge: "UI/UX" },
                    { name: "plugin", desc: "Package namespaced bundles of skills, agents, rules, and MCP servers.", badge: "Plugins" },
                    { name: "antigravity_guide", desc: "Comprehensive documentation and quick reference for Antigravity IDE.", badge: "Docs" },
                  ].map((skill) => (
                    <div key={skill.name} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300 font-mono text-[11px]">{skill.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">{skill.badge}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{skill.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeActivity === "search" && (
              <div className="flex flex-col h-full bg-[#0d131f] text-xs p-3 space-y-3">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                  Codebase Search
                </span>
                <input
                  type="text"
                  placeholder="Cari simbol, function, class..."
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleExecuteTerminal(`node -e "console.log('Search symbol:', '${(e.target as any).value}');"`);
                    }
                  }}
                />
                <p className="text-[11px] text-slate-500">Tekan Enter untuk mencari simbol di seluruh basis kode.</p>
              </div>
            )}

            {activeActivity === "agent" && (
              <div className="flex flex-col h-full bg-[#0d131f] text-xs p-3 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                  Antigravity Sessions
                </span>
                <p className="text-[11px] text-slate-400">
                  Gunakan jendela Agent di sebelah kanan untuk memulai sesi otonom baru atau memilih subagent.
                </p>
              </div>
            )}
          </aside>
        )}

        {/* ========================================================
            CENTER & RIGHT WORKSPACE (Editor, Terminal & Agent)
        ======================================================== */}
        <div className="flex flex-1 min-w-0 min-h-0">
          {/* CENTER: EDITOR + BOTTOM TERMINAL DRAWER */}
          <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#080c14] border-r border-[#1a2336]">
            {/* Center Multi-Tab Code & Artifact Editor */}
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
              <AntigravityEditor
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTab}
                onUpdateContent={handleUpdateContent}
                onSaveFile={handleSaveFile}
                onRunFileInTerminal={(filePath) => {
                  setIsTerminalOpen(true);
                  handleExecuteTerminal(`node ${filePath}`);
                }}
              />
            </div>

            {/* ========================================================
                BOTTOM DRAWER: TERMINAL & OUTPUT (Like VS Code)
            ======================================================== */}
            {isTerminalOpen && (
              <div className="h-64 sm:h-72 border-t border-[#1f293d] bg-[#090d16] flex flex-col shrink-0 select-text font-mono z-30">
                {/* Drawer Header Tabs */}
                <div className="flex items-center justify-between border-b border-slate-800/80 px-2.5 py-1 bg-[#0b101b] select-none text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTerminalActiveTab("terminal")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                        terminalActiveTab === "terminal"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <TerminalIcon size={12} />
                      <span>Terminal</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerminalActiveTab("output")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                        terminalActiveTab === "output"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>Output</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerminalActiveTab("problems")}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                        terminalActiveTab === "problems"
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>Problems (0)</span>
                    </button>
                  </div>

                  {/* Presets and Close */}
                  <div className="flex items-center gap-1.5">
                    <div className="hidden sm:flex items-center gap-1">
                      {["node -v", "git status", "dir"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleExecuteTerminal(p)}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/70 hover:bg-slate-700 text-slate-300 transition"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTerminalOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Close Terminal Drawer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Terminal Content Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs custom-scrollbar">
                  <div className="text-[11px] text-slate-500 select-none border-b border-slate-800/60 pb-1.5">
                    DNA AI Antigravity Interactive Sandbox Terminal [v2.0]
                    <br />
                    Environment: Isolated Per-User Workspace • Writable Sandbox
                  </div>

                  {terminalLogs.map((log) => (
                    <div key={log.id} className="space-y-1">
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
                      {log.stdout && (
                        <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-900">
                          {log.stdout}
                        </pre>
                      )}
                      {log.stderr && (
                        <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-red-400 bg-red-950/20 p-2 rounded border border-red-900/40">
                          {log.stderr}
                        </pre>
                      )}
                    </div>
                  ))}

                  {terminalRunning && (
                    <div className="flex items-center gap-2 text-cyan-400 text-xs py-1">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      <span className="animate-pulse">Menjalankan di sandbox...</span>
                    </div>
                  )}

                  <div ref={terminalEndRef} />
                </div>

                {/* Terminal Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleExecuteTerminal();
                  }}
                  className="flex items-center gap-2 border-t border-slate-800 bg-[#0a0f1a] p-2"
                >
                  <span className="text-cyan-400 font-bold select-none text-xs">PS &gt;</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="Ketik perintah terminal (e.g. dir, node isEven.js, node --test isEven.test.js)..."
                    disabled={terminalRunning}
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!terminalInput.trim() || terminalRunning}
                    className="flex items-center gap-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-0.5 text-xs font-semibold disabled:opacity-40"
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Run</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* RIGHT: ANTIGRAVITY AGENT PAIR-PROGRAMMER (CHILDREN) */}
          <div className="flex h-full w-full max-w-[420px] lg:max-w-[460px] xl:max-w-[500px] shrink-0 border-l border-[#1a2336] bg-[#090d16] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
