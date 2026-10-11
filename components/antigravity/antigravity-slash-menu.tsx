"use client";

import React, { useEffect, useRef } from "react";
import {
  Compass,
  Target,
  BrainCircuit,
  HelpCircle,
  Globe,
  Clock,
  BookOpen,
  Zap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  ANTIGRAVITY_SLASH_COMMANDS,
  type SlashCommand,
} from "./slash-commands";

interface AntigravitySlashMenuProps {
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Compass,
  Target,
  BrainCircuit,
  HelpCircle,
  Globe,
  Clock,
  BookOpen,
};

export function AntigravitySlashMenu({
  filter,
  selectedIndex,
  onSelect,
  onClose,
}: AntigravitySlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const cleanFilter = filter.toLowerCase().trim();
  const filteredCommands = ANTIGRAVITY_SLASH_COMMANDS.filter((cmd) => {
    if (!cleanFilter) return true;
    return (
      cmd.command.toLowerCase().includes(cleanFilter) ||
      cmd.label.toLowerCase().includes(cleanFilter) ||
      cmd.description.toLowerCase().includes(cleanFilter)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 z-50 mb-2 w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-2 text-[11px] font-semibold tracking-wide text-cyan-400">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-cyan-400 animate-pulse" />
          <span>ANTIGRAVITY SLASH COMMANDS</span>
        </div>
        <span className="text-[10px] text-slate-400 font-normal">
          Gunakan ↑ ↓ dan Enter
        </span>
      </div>

      <div className="mt-1 max-h-64 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
        {filteredCommands.map((item, idx) => {
          const Icon = ICON_MAP[item.iconName] || Zap;
          const isSelected = idx === selectedIndex % filteredCommands.length;

          return (
            <button
              key={item.command}
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left transition ${
                isSelected
                  ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-100 shadow-sm"
                  : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    isSelected
                      ? "border-cyan-400/50 bg-cyan-500/30 text-cyan-200"
                      : "border-slate-700 bg-slate-800/80 text-cyan-400"
                  }`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {item.command}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {item.label}
                    </span>
                    <span className="rounded bg-slate-800 border border-slate-700/60 px-1.5 py-0.2 text-[9px] text-cyan-400/90 font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={14}
                className={`shrink-0 ml-2 transition ${
                  isSelected ? "text-cyan-400 translate-x-0.5" : "text-slate-600"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
