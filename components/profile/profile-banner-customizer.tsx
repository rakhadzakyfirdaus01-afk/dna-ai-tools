"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Video,
  Upload,
  Check,
  RotateCcw,
  Sliders,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  ProfileBannerConfig,
  BANNER_PRESETS,
  BANNER_STORAGE_KEY,
  DEFAULT_BANNER_CONFIG,
  ProfileBannerView,
} from "./profile-media";

interface ProfileBannerCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProfileBannerConfig;
  onUpdate: (newConfig: ProfileBannerConfig) => void;
}

export function ProfileBannerCustomizer({
  isOpen,
  onClose,
  config,
  onUpdate,
}: ProfileBannerCustomizerProps) {
  const [localConfig, setLocalConfig] = useState<ProfileBannerConfig>(config);
  const [activeTab, setActiveTab] = useState<"live" | "image">(config.mode);
  const [uploading, setUploading] = useState(false);
  const [selectedCustomFile, setSelectedCustomFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const presetsForTab = BANNER_PRESETS.filter((p) => p.mode === activeTab);

  const handleSelectPreset = (presetId: string) => {
    const updated: ProfileBannerConfig = {
      ...localConfig,
      enabled: true,
      mode: activeTab,
      presetId,
      customUrl: null, // Clear custom URL when selecting preset
    };
    setLocalConfig(updated);
    onUpdate(updated);
  };

  const handleCustomFileUpload = async (file: File) => {
    setSelectedCustomFile(file);
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file); // Uses existing upload route with resource_type auto

      const res = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengupload background");
      }

      if (data.image) {
        const isVideo = file.type.startsWith("video/") || file.name.endsWith(".mp4") || file.name.endsWith(".webm");
        const updated: ProfileBannerConfig = {
          ...localConfig,
          enabled: true,
          mode: isVideo ? "live" : "image",
          customUrl: data.image,
          customType: isVideo ? "video" : "image",
        };
        setLocalConfig(updated);
        onUpdate(updated);
        toast.success(
          isVideo
            ? "Live Video Background berhasil dipasang!"
            : "Foto Background berhasil dipasang!"
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah file background");
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = () => {
    setLocalConfig(DEFAULT_BANNER_CONFIG);
    onUpdate(DEFAULT_BANNER_CONFIG);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(DEFAULT_BANNER_CONFIG));
    } catch {}
    toast.success("Background direset ke bawaan DNA AI");
  };

  const handleToggleEnabled = (enabled: boolean) => {
    const updated = { ...localConfig, enabled };
    setLocalConfig(updated);
    onUpdate(updated);
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700 bg-[#0B1120] p-4 sm:p-6 shadow-2xl text-white custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Kustomisasi Background</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Pilih foto biasa atau live video/animasi bergerak gaya TikTok.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* LIVE PREVIEW BANNER */}
        <div className="my-4 sm:my-5 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-inner">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] sm:text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Eye size={12} className="text-cyan-400" />
              Preview Tampilan Profil
            </span>
            <span>{localConfig.enabled ? "Aktif" : "Dinonaktifkan"}</span>
          </div>

          <div className="relative">
            <ProfileBannerView config={localConfig} className="h-28 sm:h-32 w-full" />
            {!localConfig.enabled && (
              <div className="h-28 sm:h-32 flex items-center justify-center bg-slate-900 text-xs text-slate-500">
                Background dinonaktifkan (polos)
              </div>
            )}
          </div>
        </div>

        {/* MASTER ON/OFF TOGGLE */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div>
            <p className="text-xs font-semibold text-slate-200">Tampilkan Background</p>
            <p className="text-[11px] text-slate-400">
              Nyalakan atau matikan sampul banner di kartu profil.
            </p>
          </div>

          <input
            type="checkbox"
            checked={localConfig.enabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
            className="h-5 w-5 accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* TABS: [🔴 LIVE ANIMATED TIKTOK] vs [📷 FOTO BIASA] */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-[#060A14] p-1.5 mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab("live");
              setLocalConfig((prev) => ({ ...prev, mode: "live" }));
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              activeTab === "live"
                ? "bg-gradient-to-r from-red-500/20 to-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <Video size={15} />
            <span>Live Video / Animasi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("image");
              setLocalConfig((prev) => ({ ...prev, mode: "image" }));
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              activeTab === "image"
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ImageIcon size={15} />
            <span>Foto Biasa Estetik</span>
          </button>
        </div>

        {/* PRESET GRID */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {activeTab === "live"
              ? "Pilih Efek Live Animasi (TikTok Style)"
              : "Pilih Wallpaper Foto Biasa"}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
            {presetsForTab.map((preset) => {
              const isSelected =
                localConfig.presetId === preset.id && !localConfig.customUrl;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/15 text-white ring-1 ring-cyan-500"
                      : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.accentColor }}
                      />
                      <p className="text-xs font-semibold truncate">{preset.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* UPLOAD CUSTOM FILE (Foto / Video Sendiri) */}
        <div className="rounded-2xl border border-slate-800 bg-[#060A14] p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Upload Background Sendiri
            </span>
            <span className="text-[10px] text-slate-500">
              Mendukung MP4, WebM, GIF, JPG, PNG
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCustomFileUpload(file);
              }}
              className="text-xs text-slate-400 file:mr-2 file:rounded-lg file:border file:border-slate-700 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-700 w-full cursor-pointer"
            />
            {uploading && (
              <span className="text-xs text-cyan-400 shrink-0 animate-pulse">
                Mengunggah...
              </span>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw size={12} />
            <span>Reset Bawaan</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:brightness-110 transition active:scale-95"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
