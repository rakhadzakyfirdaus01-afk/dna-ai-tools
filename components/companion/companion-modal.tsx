"use client";

import React, { useState, useEffect } from "react";
import {
  CompanionConfig,
  CompanionSkin,
  CompanionColor,
  CompanionAccessory,
  CompanionSize,
  SKINS_DATA,
  ACCESSORIES_DATA,
  COLOR_MAP,
  saveCompanionConfig,
  getCompanionConfig,
} from "@/lib/companion-store";
import CompanionAvatar from "./companion-avatar";
import { X, Sparkles, Check, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompanionModal({
  isOpen,
  onClose,
}: CompanionModalProps) {
  const [config, setConfig] = useState<CompanionConfig>(getCompanionConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(getCompanionConfig());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveCompanionConfig(config);
    toast.success("Karakter DNA Companion berhasil disimpan! ✨");
    onClose();
  };

  const handleReset = () => {
    const defaultConfig: CompanionConfig = {
      enabled: true,
      skin: "dna-droid",
      color: "cyan",
      accessory: "none",
      size: "normal",
      name: "DNA Buddy",
    };
    setConfig(defaultConfig);
    saveCompanionConfig(defaultConfig);
    toast.info("Karakter dikembalikan ke setelan bawaan");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-cyan-500/30 bg-zinc-950/95 text-zinc-100 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Kustomisasi DNA Companion
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                  MASKOT
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Atur gaya, aksesoris, dan warna neon karakter kecilmu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ====================================================
              LIVE PREVIEW & STATUS
              ==================================================== */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 overflow-hidden">
            {/* Cyber Background Glow */}
            <div
              className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{ backgroundColor: COLOR_MAP[config.color].hex }}
            />

            {/* Toggle ON/OFF Quick Bar */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <span className="text-[11px] text-zinc-400">
                Status: {config.enabled ? "Aktif (ON)" : "Mati (OFF)"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Preview Avatar */}
            <div className="py-2 flex flex-col items-center">
              <CompanionAvatar config={config} isFloating={config.enabled} />
              <input
                type="text"
                value={config.name}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nama Karakter..."
                className="mt-4 text-center text-sm font-semibold bg-zinc-900/90 border border-zinc-700 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500 transition w-44"
              />
              <span className="mt-1 text-[11px] text-zinc-500">
                Karakter selalu memakai logo DNA AI bawaan
              </span>
            </div>
          </div>

          {/* ====================================================
              1. PILIH SKIN / MODEL KARAKTER
              ==================================================== */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 block">
              1. Model / Kostum Karakter
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SKINS_DATA.map((skin) => {
                const isSelected = config.skin === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, skin: skin.id }))
                    }
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">
                        {skin.name}
                      </span>
                      {isSelected && (
                        <Check size={14} className="text-cyan-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">
                      {skin.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================
              2. WARNA NEON GLOW
              ==================================================== */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 block">
              2. Warna Aura Neon
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(COLOR_MAP) as CompanionColor[]).map((colorKey) => {
                const item = COLOR_MAP[colorKey];
                const isSelected = config.color === colorKey;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, color: colorKey }))
                    }
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      isSelected
                        ? "border-white bg-zinc-800 shadow-md"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                      style={{
                        backgroundColor: item.hex,
                        boxShadow: `0 0 8px ${item.hex}`,
                      }}
                    />
                    <span className="text-[11px] font-medium text-zinc-300 truncate">
                      {item.label.split(" ")[1] || item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================
              3. AKSESORIS TAMBAHAN
              ==================================================== */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 block">
              3. Aksesoris Tambahan
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCESSORIES_DATA.map((acc) => {
                const isSelected = config.accessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, accessory: acc.id }))
                    }
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                        : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-base">{acc.icon}</span>
                    <span className="text-xs font-medium text-zinc-200">
                      {acc.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ====================================================
              4. UKURAN KARAKTER
              ==================================================== */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5 block">
              4. Ukuran Tampilan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "compact", label: "Kecil (Imut)" },
                  { id: "normal", label: "Standar (Ideal)" },
                  { id: "large", label: "Besar (Jelas)" },
                ] as { id: CompanionSize; label: string }[]
              ).map((sz) => {
                const isSelected = config.size === sz.id;
                return (
                  <button
                    key={sz.id}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, size: sz.id }))
                    }
                    className={`py-2 px-3 text-center rounded-xl border text-xs font-semibold transition ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/15 text-cyan-300"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 px-5 py-3.5 bg-zinc-900/70">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            <RefreshCw size={13} />
            <span>Reset Bawaan</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-500/20 transition active:scale-95"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
