"use client";

import React, { useState, useEffect } from "react";
import {
  Minus,
  Square,
  X,
  Download,
  FolderOpen,
  Search,
  Sparkles,
  Terminal,
  Settings,
  HelpCircle,
  FileCode2,
  Code2,
  Check,
  Play,
  RotateCw,
  Cpu,
} from "lucide-react";

interface AntigravityTitlebarProps {
  workspaceName?: string;
  onOpenCommandPalette?: () => void;
  onToggleTerminal?: () => void;
  onToggleExplorer?: () => void;
  onNewFile?: () => void;
  onRefreshWorkspace?: () => void;
}

export function AntigravityTitlebar({
  workspaceName = "dna-workspace",
  onOpenCommandPalette,
  onToggleTerminal,
  onToggleExplorer,
  onNewFile,
  onRefreshWorkspace,
}: AntigravityTitlebarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsPwaInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Petunjuk manual instalasi PWA
      alert(
        "Untuk menginstall DNA AI sebagai aplikasi desktop:\n1. Klik ikon Install di URL bar browser Anda (Chrome/Edge/Brave)\n2. Atau klik menu titik tiga browser -> Simpan & Bagikan -> Install DNA AI sebagai Aplikasi."
      );
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="flex h-10 w-full items-center justify-between border-b border-[#1f293d] bg-[#090d16] px-2 text-xs select-none z-50 shrink-0">
      {/* LEFT: DNA AI BRANDING & MENU BAR */}
      <div className="flex items-center gap-2">
        {/* DNA AI Logo with Antigravity Neon Helix Glow */}
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-slate-800/60 transition cursor-pointer">
          <div className="relative flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-600 p-0.5 shadow-sm shadow-cyan-500/30">
            <div className="flex h-full w-full items-center justify-center rounded-[3px] bg-[#090d16]">
              <Sparkles className="h-3 w-3 text-cyan-400" />
            </div>
          </div>
          <span className="font-bold tracking-tight text-slate-100 flex items-center gap-1">
            DNA AI
            <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40 font-mono">
              Antigravity 2.0
            </span>
          </span>
        </div>

        {/* Dropdown Menus */}
        <div className="relative flex items-center gap-0.5 text-slate-300">
          {/* File Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
              className={`px-2 py-1 rounded hover:bg-slate-800/80 hover:text-white transition ${
                activeMenu === "file" ? "bg-slate-800 text-white" : ""
              }`}
            >
              File
            </button>
            {activeMenu === "file" && (
              <div
                className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-slate-800 bg-[#0d1322] p-1 shadow-2xl z-50 text-slate-300"
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  type="button"
                  onClick={() => {
                    onNewFile?.();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <span>New File...</span>
                  <span className="text-[10px] text-slate-500">Ctrl+N</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRefreshWorkspace?.();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <span>Refresh Workspace</span>
                  <span className="text-[10px] text-slate-500">Ctrl+R</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    handleInstallClick();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <Download size={13} />
                  <span>Install Desktop App</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            className="px-2 py-1 rounded hover:bg-slate-800/80 hover:text-white transition"
          >
            Edit
          </button>

          {/* View Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu(activeMenu === "view" ? null : "view")}
              className={`px-2 py-1 rounded hover:bg-slate-800/80 hover:text-white transition ${
                activeMenu === "view" ? "bg-slate-800 text-white" : ""
              }`}
            >
              View
            </button>
            {activeMenu === "view" && (
              <div
                className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-slate-800 bg-[#0d1322] p-1 shadow-2xl z-50 text-slate-300"
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  type="button"
                  onClick={() => {
                    onToggleExplorer?.();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <span>Toggle Explorer</span>
                  <span className="text-[10px] text-slate-500">Ctrl+B</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggleTerminal?.();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <span>Toggle Terminal</span>
                  <span className="text-[10px] text-slate-500">Ctrl+`</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setActiveMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-2.5 py-1.5 rounded hover:bg-cyan-600 hover:text-white text-left transition"
                >
                  <span>Toggle Fullscreen</span>
                  <span className="text-[10px] text-slate-500">F11</span>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Menu */}
          <button
            type="button"
            onClick={() => onToggleTerminal?.()}
            className="px-2 py-1 rounded hover:bg-slate-800/80 hover:text-white transition"
          >
            Terminal
          </button>

          {/* Help Menu */}
          <button
            type="button"
            onClick={() => alert("DNA AI Antigravity 2.0\nVersi Desktop IDE otonom dengan subagent multi-kolaborasi, security gate terverifikasi, dan workspace terisolasi.")}
            className="px-2 py-1 rounded hover:bg-slate-800/80 hover:text-white transition"
          >
            Help
          </button>
        </div>
      </div>

      {/* CENTER: SEARCH / COMMAND PALETTE PILL */}
      <div className="flex-1 max-w-lg mx-4">
        <button
          type="button"
          onClick={() => onOpenCommandPalette?.()}
          className="flex w-full items-center justify-between rounded-lg border border-slate-800/90 bg-[#121929]/80 hover:bg-[#162136] hover:border-cyan-500/40 px-3 py-1 text-slate-400 transition shadow-inner group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={13} className="text-slate-500 group-hover:text-cyan-400 transition" />
            <span className="truncate text-[11px] text-slate-300 font-mono">
              {workspaceName} <span className="text-slate-500">• Cari simbol, file, atau perintah (/plan, /goal)</span>
            </span>
          </div>
          <span className="rounded bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono shrink-0">
            Ctrl+P
          </span>
        </button>
      </div>

      {/* RIGHT: DESKTOP APP INSTALL, WORKSPACE BADGE & WINDOW CONTROLS */}
      <div className="flex items-center gap-2">
        {/* Desktop App Install Pill */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 hover:from-cyan-600/30 hover:to-indigo-600/30 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 shadow-sm transition"
          title="Install DNA AI sebagai aplikasi desktop mandiri (mirip Microsoft Word / APK)"
        >
          <Download size={12} className="animate-bounce" />
          <span>Install Desktop App</span>
        </button>

        {/* Workspace Connection Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Writable Sandbox</span>
        </div>

        {/* Windows Desktop Window Controls (_ [] X) */}
        <div className="flex items-center ml-1 border-l border-slate-800/80 pl-2">
          <button
            type="button"
            onClick={() => {}}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Tutup sesi DNA AI Desktop?")) {
                window.close();
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-red-600 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
