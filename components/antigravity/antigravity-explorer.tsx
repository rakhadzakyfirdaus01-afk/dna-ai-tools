"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  File,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  Check,
} from "lucide-react";
import type { WorkspaceFileEntry } from "@/app/api/workspace/route";

interface AntigravityExplorerProps {
  onOpenFile: (filePath: string) => void;
  activeFilePath?: string;
  refreshTrigger?: number;
}

export function AntigravityExplorer({
  onOpenFile,
  activeFilePath,
  refreshTrigger,
}: AntigravityExplorerProps) {
  const [tree, setTree] = useState<WorkspaceFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [workspaceInfo, setWorkspaceInfo] = useState<{ workspaceId: string; workspaceDir: string } | null>(null);

  const fetchTree = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/workspace");
      const data = await res.json();
      if (data.success) {
        setTree(data.tree || []);
        setWorkspaceInfo({
          workspaceId: data.workspaceId,
          workspaceDir: data.workspaceDir,
        });
      }
    } catch (err) {
      console.error("Gagal memuat pohon berkas workspace:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [refreshTrigger]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          filePath: newFileName.trim(),
          content: "// Dibuat melalui DNA AI Antigravity Explorer\n",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewFileName("");
        setIsCreatingFile(false);
        await fetchTree();
        onOpenFile(data.filePath);
      }
    } catch (err) {
      console.error("Gagal membuat file:", err);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "mjs":
      case "cjs":
        return <FileCode2 size={13} className="text-amber-400 shrink-0" />;
      case "ts":
      case "tsx":
        return <FileCode2 size={13} className="text-cyan-400 shrink-0" />;
      case "json":
        return <FileText size={13} className="text-yellow-400 shrink-0" />;
      case "md":
        return <FileText size={13} className="text-blue-400 shrink-0" />;
      case "css":
        return <FileCode2 size={13} className="text-pink-400 shrink-0" />;
      default:
        return <File size={13} className="text-slate-400 shrink-0" />;
    }
  };

  const renderTree = (entries: WorkspaceFileEntry[], depth = 0) => {
    return (
      <div className="space-y-0.5">
        {entries.map((entry) => {
          const isExpanded = expandedFolders[entry.path] ?? depth === 0;
          const isActive = activeFilePath === entry.path;

          if (entry.isDirectory) {
            return (
              <div key={entry.path}>
                <button
                  type="button"
                  onClick={() => toggleFolder(entry.path)}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  className="flex w-full items-center gap-1.5 py-1 text-xs text-slate-300 hover:bg-slate-800/60 rounded transition group text-left"
                >
                  {isExpanded ? (
                    <ChevronDown size={12} className="text-slate-500 group-hover:text-slate-300" />
                  ) : (
                    <ChevronRight size={12} className="text-slate-500 group-hover:text-slate-300" />
                  )}
                  {isExpanded ? (
                    <FolderOpen size={14} className="text-cyan-400 shrink-0" />
                  ) : (
                    <Folder size={14} className="text-cyan-500 shrink-0" />
                  )}
                  <span className="truncate font-medium">{entry.name}</span>
                </button>
                {isExpanded && entry.children && (
                  <div className="border-l border-slate-800/60 ml-2">
                    {renderTree(entry.children, depth + 1)}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={entry.path}
              type="button"
              onClick={() => onOpenFile(entry.path)}
              style={{ paddingLeft: `${depth * 12 + 16}px` }}
              className={`flex w-full items-center gap-2 py-1 text-xs rounded transition text-left group ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-300 font-semibold border-l-2 border-cyan-400"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              {getFileIcon(entry.name)}
              <span className="truncate">{entry.name}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0d131f] border-r border-[#1e2738] select-none text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2 bg-[#090d16]">
        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCreatingFile(true)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
            title="New File..."
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={fetchTree}
            disabled={isLoading}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
            title="Refresh Explorer"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Workspace Root Header */}
      <div className="px-3 py-1.5 bg-[#0b101c] border-b border-slate-800/40 text-[10px] text-slate-500 flex items-center justify-between font-mono">
        <span className="truncate">WORKSPACE: {workspaceInfo?.workspaceId || "sandbox"}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>

      {/* New File Inline Form */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFile} className="p-2 border-b border-slate-800 bg-[#121929]">
          <input
            type="text"
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="nama-file.js atau src/app.ts"
            className="w-full bg-slate-900 border border-cyan-500/60 rounded px-2 py-1 text-xs text-white outline-none font-mono"
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsCreatingFile(false);
            }}
          />
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => setIsCreatingFile(false)}
              className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
        {tree.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
            <FolderOpen size={28} className="text-slate-600" />
            <p className="text-xs">Workspace sandbox kosong.</p>
            <button
              type="button"
              onClick={() => setIsCreatingFile(true)}
              className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Plus size={11} />
              <span>Buat berkas baru</span>
            </button>
          </div>
        ) : (
          renderTree(tree)
        )}
      </div>
    </div>
  );
}
