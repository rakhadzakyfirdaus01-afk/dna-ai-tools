"use client";

import React, { useState, useEffect } from "react";
import {
  FileCode2,
  FileText,
  X,
  Save,
  Play,
  Copy,
  Check,
  Eye,
  Sparkles,
  Download,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface EditorTab {
  id: string;
  title: string;
  filePath?: string;
  content: string;
  isDirty?: boolean;
  type: "code" | "artifact" | "preview";
}

interface AntigravityEditorProps {
  tabs: EditorTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onUpdateContent: (tabId: string, content: string) => void;
  onSaveFile: (tabId: string) => Promise<boolean>;
  onRunFileInTerminal?: (filePath: string) => void;
}

export function AntigravityEditor({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onUpdateContent,
  onSaveFile,
  onRunFileInTerminal,
}: AntigravityEditorProps) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Hotkey Ctrl+S untuk menyimpan berkas aktif
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (activeTab && activeTab.type === "code") {
          setIsSaving(true);
          onSaveFile(activeTab.id).finally(() => setIsSaving(false));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, onSaveFile]);

  const handleCopy = async () => {
    if (!activeTab) return;
    try {
      await navigator.clipboard.writeText(activeTab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!activeTab || tabs.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[#0a0e17] text-slate-500 p-8 text-center select-none">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600/20 via-indigo-600/20 to-fuchsia-600/20 border border-slate-800 mb-4 shadow-xl">
          <FileCode2 size={32} className="text-cyan-400" />
        </div>
        <h2 className="text-base font-bold text-slate-300">DNA AI Antigravity Editor</h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm">
          Pilih berkas dari Explorer di sebelah kiri untuk melihat atau mengedit kode, atau ajukan pertanyaan kepada Agent.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Ctrl+P</span>
          <span>Buka Command Palette</span>
        </div>
      </div>
    );
  }

  // Generate baris nomor untuk editor
  const lines = activeTab.content.split("\n");

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0e17] overflow-hidden select-none">
      {/* ========================================================
          TAB BAR (Like VS Code & Antigravity)
      ======================================================== */}
      <div className="flex items-center justify-between border-b border-[#1f283d] bg-[#0c121e] px-1 overflow-x-auto custom-scrollbar shrink-0">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center gap-2 border-r border-[#1a2336] px-3 py-2 text-xs cursor-pointer transition select-none ${
                  isActive
                    ? "bg-[#0a0e17] text-cyan-300 font-semibold border-t-2 border-t-cyan-400"
                    : "text-slate-400 hover:bg-[#121927] hover:text-slate-200"
                }`}
              >
                {tab.type === "artifact" ? (
                  <Sparkles size={13} className="text-indigo-400 shrink-0" />
                ) : (
                  <FileCode2 size={13} className="text-cyan-400 shrink-0" />
                )}
                <span className="truncate max-w-[140px] font-mono">{tab.title}</span>
                {tab.isDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" title="Unsaved changes" />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="rounded p-0.5 text-slate-500 opacity-60 group-hover:opacity-100 hover:bg-slate-800 hover:text-white transition"
                  title="Close tab"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tab Actions */}
        <div className="flex items-center gap-1 px-2 shrink-0">
          {activeTab.filePath && activeTab.type === "code" && (
            <button
              type="button"
              onClick={() => onRunFileInTerminal?.(activeTab.filePath!)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
              title="Jalankan berkas ini di Terminal Sandbox"
            >
              <Play size={11} fill="currentColor" />
              <span>Run</span>
            </button>
          )}

          {activeTab.type === "code" && (
            <button
              type="button"
              onClick={() => {
                setIsSaving(true);
                onSaveFile(activeTab.id).finally(() => setIsSaving(false));
              }}
              disabled={isSaving}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold transition ${
                activeTab.isDirty
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
              }`}
              title="Simpan perubahan (Ctrl+S)"
            >
              <Save size={12} />
              <span>{isSaving ? "Saving..." : activeTab.isDirty ? "Save *" : "Saved"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-white transition border border-transparent"
            title="Salin isi berkas"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Path Bar */}
      <div className="flex items-center justify-between border-b border-slate-900 bg-[#090d15] px-4 py-1 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5 truncate">
          <span>workspace</span>
          <span>&gt;</span>
          <span className="text-slate-300 font-medium">{activeTab.filePath || activeTab.title}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>{lines.length} lines</span>
          <span>UTF-8</span>
          <span className="text-cyan-400 uppercase font-semibold">
            {activeTab.filePath?.split(".").pop() || activeTab.type}
          </span>
        </div>
      </div>

      {/* ========================================================
          EDITOR CONTENT BODY
      ======================================================== */}
      <div className="flex-1 overflow-auto flex bg-[#080c14] select-text">
        {activeTab.type === "code" ? (
          <div className="flex min-w-full min-h-full font-mono text-xs leading-relaxed">
            {/* Line Numbers */}
            <div className="w-12 py-3 bg-[#0a0f1a] text-slate-600 text-right pr-3 select-none border-r border-slate-800/60 shrink-0 font-mono">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Input Area */}
            <textarea
              value={activeTab.content}
              onChange={(e) => onUpdateContent(activeTab.id, e.target.value)}
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-slate-200 outline-none p-3 resize-none font-mono text-xs leading-6 selection:bg-cyan-500/30 whitespace-pre"
            />
          </div>
        ) : (
          /* Artifact Markdown / Rich View */
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto custom-scrollbar text-slate-200 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold text-white border-b border-slate-800 pb-2 mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-cyan-300 border-b border-slate-800/60 pb-1.5 mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold text-indigo-300 mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-xs text-slate-300 mb-3 leading-relaxed">{children}</p>,
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="rounded bg-slate-800/80 px-1.5 py-0.5 text-cyan-300 font-mono text-[11px] border border-slate-700/60">
                      {children}
                    </code>
                  ) : (
                    <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090d16] p-4 text-xs font-mono text-slate-300 my-3 leading-relaxed">
                      <code>{children}</code>
                    </pre>
                  );
                },
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-xs text-slate-300 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-300 my-2">{children}</ol>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-cyan-500 bg-cyan-950/20 p-3 rounded-r-lg text-xs italic text-slate-300 my-3">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {activeTab.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
