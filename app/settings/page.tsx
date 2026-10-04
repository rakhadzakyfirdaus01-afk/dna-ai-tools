"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Bell,
  Shield,
  User as UserIcon,
  ArrowLeft,
  Sparkles,
  LogOut,
  Bot,
  Sliders,
  Image as ImageIcon,
} from "lucide-react";
import AppLayout from "@/components/layout/app-layout";
import {
  getCompanionConfig,
  saveCompanionConfig,
  openCompanionCustomizer,
  COMPANION_EVENT_KEY,
  type CompanionConfig,
} from "@/lib/companion-store";
import {
  ProfileAvatar,
  ProfileBannerView,
  type ProfileBannerConfig,
  BANNER_STORAGE_KEY,
  DEFAULT_BANNER_CONFIG,
} from "@/components/profile/profile-media";
import { ProfileBannerCustomizer } from "@/components/profile/profile-banner-customizer";

export default function SettingsPage() {

  const router = useRouter();
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState(
    session?.user?.image ?? "/logo-dna.png"
  );
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [notification, setNotification] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  // DNA Companion (Karakter Kecil)
  const [companionEnabled, setCompanionEnabled] = useState(true);

  // Background Profil (Gaya TikTok Live / Biasa)
  const [bannerConfig, setBannerConfig] = useState<ProfileBannerConfig>(DEFAULT_BANNER_CONFIG);
  const [bannerCustomizerOpen, setBannerCustomizerOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(BANNER_STORAGE_KEY);
      if (saved) {
        setBannerConfig(JSON.parse(saved));
      }
    } catch {}

    const handleBannerUpdate = () => {
      try {
        const saved = localStorage.getItem(BANNER_STORAGE_KEY);
        if (saved) setBannerConfig(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("dna-profile-bg-updated", handleBannerUpdate);
    return () => {
      window.removeEventListener("dna-profile-bg-updated", handleBannerUpdate);
    };
  }, []);

  const handleUpdateBanner = (newCfg: ProfileBannerConfig) => {
    setBannerConfig(newCfg);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(newCfg));
      window.dispatchEvent(new CustomEvent("dna-profile-bg-updated"));
    } catch {}
  };

  const [bannerUploading, setBannerUploading] = useState(false);

  // Ganti background profil langsung lewat Windows File Explorer (foto bebas / video)
  const handleDirectBackgroundFile = async (file: File) => {
    const isVideo =
      file.type.startsWith("video/") ||
      file.name.endsWith(".mp4") ||
      file.name.endsWith(".webm") ||
      file.name.endsWith(".mov");

    // Instant preview (0 ms)
    const localUrl = URL.createObjectURL(file);
    const instantCfg: ProfileBannerConfig = {
      ...bannerConfig,
      enabled: true,
      mode: isVideo ? "live" : "image",
      customUrl: localUrl,
      customType: isVideo ? "video" : "image",
    };
    handleUpdateBanner(instantCfg);
    toast.success(
      isVideo
        ? "Video LIVE background berhasil dipasang!"
        : "Foto background berhasil dipasang!"
    );

    // Upload ke server agar tersimpan permanen
    try {
      setBannerUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.image) {
        const persistedCfg: ProfileBannerConfig = {
          ...instantCfg,
          customUrl: data.image,
        };
        handleUpdateBanner(persistedCfg);
      }
    } catch (e) {
      console.error("Background upload error:", e);
    } finally {
      setBannerUploading(false);
    }
  };

  useEffect(() => {
    const cfg = getCompanionConfig();
    setCompanionEnabled(cfg.enabled);

    const handleCompanionUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanionConfig>;
      if (customEvent.detail) {
        setCompanionEnabled(customEvent.detail.enabled);
      } else {
        setCompanionEnabled(getCompanionConfig().enabled);
      }
    };

    window.addEventListener(COMPANION_EVENT_KEY, handleCompanionUpdate);
    return () => {
      window.removeEventListener(COMPANION_EVENT_KEY, handleCompanionUpdate);
    };
  }, []);

  const handleToggleCompanion = (enabled: boolean) => {
    const current = getCompanionConfig();
    const updated = { ...current, enabled };
    setCompanionEnabled(enabled);
    saveCompanionConfig(updated);
    if (enabled) {
      toast.success("Karakter kecil (DNA Companion) diaktifkan! ✨");
    } else {
      toast.info("Karakter kecil (DNA Companion) dinonaktifkan");
    }
  };


  // Load Profile from API
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;

        const data = await response.json();
        if (data.image) {
          setProfileImage(data.image);
          await update({ image: data.image });
        }
        if (data.name) {
          setName(data.name);
          await update({ name: data.name });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }

    loadProfile();
  }, [update]);

  // Load User Settings from DB
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        if (data.settings) {
          if (data.settings.theme) {
            setTheme(data.settings.theme);
          }
          if (typeof data.settings.notifications === "boolean") {
            setNotification(data.settings.notifications);
          }
          if (typeof data.settings.animations === "boolean") {
            setAnimations(data.settings.animations);
          }
          if (typeof data.settings.autoSave === "boolean") {
            setAutoSave(data.settings.autoSave);
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }

    loadSettings();
  }, [setTheme]);

  // Handle Theme Change
  async function handleThemeChange(newTheme: "light" | "dark" | "system") {
    setTheme(newTheme);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme: newTheme,
          notifications: notification,
          animations,
          autoSave,
        }),
      });
      toast.success(
        newTheme === "system"
          ? "Tema Sistem (Biru Navy) aktif"
          : newTheme === "dark"
          ? "Tema Gelap (Hitam) aktif"
          : "Tema Terang (Putih) aktif"
      );
    } catch {
      // Abaikan error background save
    }
  }

  // Handle Preferences Change
  async function handlePreferenceChange(
    key: "notifications" | "animations" | "autoSave",
    value: boolean
  ) {
    const nextNotif = key === "notifications" ? value : notification;
    const nextAnim = key === "animations" ? value : animations;
    const nextAuto = key === "autoSave" ? value : autoSave;

    if (key === "notifications") setNotification(value);
    if (key === "animations") setAnimations(value);
    if (key === "autoSave") setAutoSave(value);

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          notifications: nextNotif,
          animations: nextAnim,
          autoSave: nextAuto,
        }),
      });
      toast.success("Preferensi berhasil diperbarui");
    } catch {
      toast.error("Gagal menyimpan preferensi");
    }
  }

  // Upload Profile Photo
  async function uploadPhoto() {
    if (!selectedImage) {
      toast.error("Pilih foto terlebih dahulu");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/profile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Upload foto gagal");
      }

      if (data.image) {
        setProfileImage(data.image);
        await update({ image: data.image });
        setSelectedImage(null);
        toast.success("Foto profil berhasil diperbarui");
      }
    } catch (error) {
      console.error("PROFILE UPLOAD ERROR:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengupload foto"
      );
    } finally {
      setUploading(false);
    }
  }

  // Save Name
  async function saveName() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    if (trimmedName.length > 50) {
      toast.error("Nama maksimal 50 karakter");
      return;
    }

    try {
      setSavingName(true);
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Gagal memperbarui nama");
      }

      setName(data.name);
      await update({ name: data.name });
      toast.success("Nama berhasil diperbarui");
    } catch (error) {
      console.error("UPDATE NAME ERROR:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memperbarui nama"
      );
    } finally {
      setSavingName(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
              Pengaturan
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sesuaikan preferensi, tema, dan informasi profil workspace AI Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/ai-assistant")}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500 hover:text-white"
          >
            <ArrowLeft size={16} />
            Kembali ke AI Asisten
          </button>
        </div>

        {/* =========================================================
            SECTION 1: TEMA TAMPILAN (THEME SELECTION)
            ========================================================= */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Palette size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground lg:text-xl">
                  Tema Tampilan
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Pilih skema warna antarmuka workspace DNA AI Anda.
                </p>
              </div>
            </div>

            <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground sm:inline-block">
              Aktif:{" "}
              {theme === "system"
                ? "Sistem (Biru Navy)"
                : theme === "dark"
                ? "Gelap (Hitam)"
                : "Terang (Putih)"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Sistem (Biru Navy) */}
            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
                theme === "system"
                  ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                  : "border-border bg-secondary/50 hover:border-cyan-500/50 hover:bg-secondary"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Monitor size={22} />
                </div>
                {theme === "system" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Sistem</h3>
                  <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                    Biru Navy
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tema bawaan DNA AI dengan nuansa biru navy modern
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
                <span
                  className="h-3 w-3 rounded-full bg-[#0B1120] border border-slate-700"
                  title="#0B1120"
                />
                <span
                  className="h-3 w-3 rounded-full bg-[#0F172A] border border-slate-700"
                  title="#0F172A"
                />
                <span
                  className="h-3 w-3 rounded-full bg-[#06B6D4]"
                  title="Cyan Accent"
                />
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Default DNA AI
                </span>
              </div>
            </button>

            {/* Gelap (Hitam OLED) */}
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
                theme === "dark"
                  ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                  : "border-border bg-secondary/50 hover:border-cyan-500/50 hover:bg-secondary"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Moon size={22} />
                </div>
                {theme === "dark" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Gelap</h3>
                  <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                    OLED Black
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hitam pekat minimalis, hemat daya dan nyaman di mata
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
                <span
                  className="h-3 w-3 rounded-full bg-black border border-zinc-700"
                  title="Pure Black"
                />
                <span
                  className="h-3 w-3 rounded-full bg-zinc-900 border border-zinc-700"
                  title="Zinc 900"
                />
                <span
                  className="h-3 w-3 rounded-full bg-[#06B6D4]"
                  title="Cyan Accent"
                />
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Pitch Black
                </span>
              </div>
            </button>

            {/* Terang (Clean White) */}
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
                theme === "light"
                  ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                  : "border-border bg-secondary/50 hover:border-cyan-500/50 hover:bg-secondary"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Sun size={22} />
                </div>
                {theme === "light" && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-white">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Terang</h3>
                  <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                    Clean White
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latar putih bersih dan cerah dengan kontras tinggi
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
                <span
                  className="h-3 w-3 rounded-full bg-white border border-slate-300"
                  title="White"
                />
                <span
                  className="h-3 w-3 rounded-full bg-slate-100 border border-slate-300"
                  title="Slate 100"
                />
                <span
                  className="h-3 w-3 rounded-full bg-[#0891B2]"
                  title="Cyan Accent"
                />
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Light Mode
                </span>
              </div>
            </button>
          </div>
        </section>

        {/* =========================================================
            SECTION 2: PROFILE USER (DENGAN TIKTOK LIVE / BIASA BACKGROUND)
            ========================================================= */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 lg:p-6 transition-all shadow-sm">
          {/* TIKTOK STYLE PROFILE COVER / BANNER */}
          {bannerConfig.enabled && (
            <div className="relative -mx-4 -mt-4 mb-4 sm:-mx-5 sm:-mt-5 sm:mb-5 lg:-mx-6 lg:-mt-6 group">
              <ProfileBannerView
                config={bannerConfig}
                className="h-32 sm:h-40 md:h-48 w-full"
              />

              {/* Tombol Ganti Background Langsung dari Banner lewat File Explorer (Responsif HP & PC) */}
              <label className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-white/20 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-white shadow-lg cursor-pointer transition active:scale-95 touch-manipulation">
                <ImageIcon size={13} className="text-cyan-400 shrink-0" />
                <span>Ganti Background</span>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDirectBackgroundFile(file);
                  }}
                />
              </label>
            </div>
          )}

          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
                <UserIcon size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground lg:text-xl">
                  Profil Pengguna
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Kelola informasi nama, foto profil, dan background akun Anda.
                </p>
              </div>
            </div>

            {/* Tombol Kustomisasi Background (Responsif HP) */}
            <button
              type="button"
              onClick={() => setBannerCustomizerOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-3.5 py-2.5 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/25 transition active:scale-95 shadow-sm cursor-pointer w-full sm:w-auto"
            >
              <Sparkles size={14} className="text-cyan-400" />
              <span>Kustomisasi Background</span>
            </button>
          </div>

          <div
            className={`flex flex-col items-center gap-4 sm:gap-6 sm:flex-row ${
              bannerConfig.enabled ? "-mt-10 sm:-mt-12" : ""
            }`}
          >
            {/* Profile Avatar (Mendukung Foto Biasa & Live Video Gaya TikTok di HP & PC) */}
            <div className="relative h-[88px] w-[88px] sm:h-[96px] sm:w-[96px] overflow-hidden rounded-full border-4 border-card ring-2 ring-cyan-500/50 shadow-2xl bg-slate-900 shrink-0">
              <ProfileAvatar
                src={profileImage}
                alt="Profile"
                size={96}
                className="h-full w-full"
                showLiveBadge={true}
              />
            </div>

            {/* User Info */}
            <div className="w-full min-w-0 sm:w-auto text-center sm:text-left">
              <h3 className="text-xl font-semibold text-foreground">
                {name || "User"}
              </h3>
              <p className="w-full break-all text-sm text-muted-foreground">
                {session?.user?.email}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-400">
                <Sparkles size={12} />
                DNA AI Member
              </div>
            </div>
          </div>

          {/* Change Name */}
          <div className="mt-6 border-t border-border pt-5">
            <label
              htmlFor="profile-name"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Nama Tampilan
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Masukkan nama Anda"
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm"
              />

              <button
                type="button"
                onClick={saveName}
                disabled={savingName || !name.trim()}
                className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 text-sm w-full sm:w-auto"
              >
                {savingName ? "Menyimpan..." : "Simpan Nama"}
              </button>
            </div>
          </div>

          {/* Upload Photo (Mendukung Foto Biasa & Live Video TikTok Style) */}
          <div className="mt-5 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
              <label className="block text-sm font-medium text-foreground">
                Ganti Foto Profil
              </label>
              <span className="text-[11px] text-cyan-400 font-medium">
                Bisa Foto Biasa atau Video LIVE TikTok
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  setSelectedImage(e.target.files?.[0] ?? null);
                }}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent cursor-pointer w-full"
              />

              <button
                type="button"
                onClick={uploadPhoto}
                disabled={uploading || !selectedImage}
                className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50 text-sm w-full sm:w-auto"
              >
                {uploading ? "Mengunggah..." : "Upload Foto / Video"}
              </button>
            </div>

            {selectedImage && (
              <p className="mt-2 text-xs text-cyan-400 flex items-center gap-1.5">
                <span className="font-semibold">File siap diunggah:</span> {selectedImage.name}
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.2 text-[10px] text-cyan-300 font-bold">
                  {selectedImage.type.startsWith("video/") ? "🎬 VIDEO LIVE TIKTOK" : "📷 FOTO BIASA"}
                </span>
              </p>
            )}
          </div>

          {/* Upload Background Profil Langsung dari File Explorer / Galeri HP (Foto Bebas / Live Video) */}
          <div className="mt-5 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
              <label className="block text-sm font-medium text-foreground">
                Ganti Background Profil
              </label>
              <span className="text-[11px] text-cyan-400 font-medium">
                Pilih foto bebas dari Galeri/Explorer HP (sepak bola, dll.) atau video live
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDirectBackgroundFile(file);
                }}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent cursor-pointer w-full"
              />

              <button
                type="button"
                onClick={() => setBannerCustomizerOpen(true)}
                className="shrink-0 flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition active:scale-95 w-full sm:w-auto"
              >
                <Sliders size={13} />
                <span>Pilih Efek Animasi & Preset</span>
              </button>
            </div>

            {bannerUploading && (
              <p className="mt-2 text-xs text-cyan-400 animate-pulse">
                Sedang memproses dan menyimpan background...
              </p>
            )}
          </div>
        </section>

        {/* =========================================================
            SECTION 3: PREFERENCES
            ========================================================= */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Bell size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground lg:text-xl">
                Preferensi Aplikasi
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Atur perilaku sistem notifikasi dan interaksi workspace.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* DNA Companion (Karakter Kecil Maskot) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 transition-all">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Bot size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      Karakter Kecil (DNA Companion)
                    </h3>
                    <span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                      INTERAKTIF
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground sm:text-sm mt-0.5">
                    Tampilkan maskot kecil interaktif dengan logo DNA AI yang bisa dikustomisasi di layar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                {companionEnabled && (
                  <button
                    type="button"
                    onClick={() => openCompanionCustomizer()}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <Sliders size={13} />
                    <span>Kustomisasi Gaya</span>
                  </button>
                )}

                <input
                  type="checkbox"
                  checked={companionEnabled}
                  onChange={(e) => handleToggleCompanion(e.target.checked)}
                  className="h-5 w-5 accent-cyan-500 cursor-pointer"
                  title="Aktifkan / Nonaktifkan Karakter Kecil"
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">

              <div>
                <h3 className="font-medium text-foreground">
                  Notifikasi Toast
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Tampilkan notifikasi toast untuk setiap aksi atau hasil fitur AI.
                </p>
              </div>

              <input
                type="checkbox"
                checked={notification}
                onChange={(e) =>
                  handlePreferenceChange("notifications", e.target.checked)
                }
                className="h-5 w-5 accent-cyan-500"
              />
            </div>

            {/* Animations */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
              <div>
                <h3 className="font-medium text-foreground">
                  Animasi UI
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Aktifkan efek transisi dan animasi interaktif pada komponen.
                </p>
              </div>

              <input
                type="checkbox"
                checked={animations}
                onChange={(e) =>
                  handlePreferenceChange("animations", e.target.checked)
                }
                className="h-5 w-5 accent-cyan-500"
              />
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
              <div>
                <h3 className="font-medium text-foreground">
                  Simpan Riwayat Otomatis
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Simpan otomatis sesi prompt dan percakapan ke riwayat akun.
                </p>
              </div>

              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) =>
                  handlePreferenceChange("autoSave", e.target.checked)
                }
                className="h-5 w-5 accent-cyan-500"
              />
            </div>
          </div>
        </section>

        {/* =========================================================
            SECTION 4: PRIVACY
            ========================================================= */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground lg:text-xl">
                Keamanan & Privasi
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Perlindungan data dan kerahasiaan prompt AI Anda.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Semua prompt teks, gambar, dan kode yang dihasilkan dienkripsi secara aman dan hanya dapat diakses melalui akun Anda. Kami mematuhi standar privasi data tertinggi untuk melindungi seluruh materi kreatif Anda.
          </p>
        </section>

        {/* =========================================================
            SECTION: LOGOUT KHUSUS HP (ANDROID & IOS)
            Hanya tampil di layar HP/smartphone (lg:hidden), laptop tetap biarin
            ========================================================= */}
        <section className="block lg:hidden rounded-2xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <LogOut size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-400">
                Keluar Akun
              </h2>
              <p className="text-xs text-muted-foreground">
                Keluar dari sesi akun DNA AI pada perangkat smartphone ini.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              signOut({
                callbackUrl: "/login",
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 active:scale-[0.98] cursor-pointer touch-manipulation"
          >
            <LogOut size={18} />
            <span>Keluar dari Akun</span>
          </button>
        </section>

        {/* =========================================================
            BOTTOM NAVIGATION
            ========================================================= */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => router.push("/ai-assistant")}
            className="rounded-xl border border-cyan-500 px-6 py-3 font-medium text-cyan-400 transition hover:bg-cyan-500 hover:text-white"
          >
            Kembali ke AI Asisten
          </button>
        </div>

        {/* Modal Kustomisasi Background Profil Gaya TikTok */}
        <ProfileBannerCustomizer
          isOpen={bannerCustomizerOpen}
          onClose={() => setBannerCustomizerOpen(false)}
          config={bannerConfig}
          onUpdate={handleUpdateBanner}
        />
      </div>
    </AppLayout>
  );
}