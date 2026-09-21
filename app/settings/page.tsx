"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import AppLayout from "@/components/layout/app-layout";

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
            SECTION 2: PROFILE USER
            ========================================================= */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <UserIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground lg:text-xl">
                Profil Pengguna
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Kelola informasi nama dan foto profil akun Anda.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Profile Image */}
            <div className="relative h-[96px] w-[96px] overflow-hidden rounded-full border-2 border-cyan-500/40 shadow-md">
              <Image
                src={profileImage}
                alt="Profile"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </div>

            {/* User Info */}
            <div className="w-full min-w-0 sm:w-auto">
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
                className="w-full rounded-xl border border-border bg-input px-4 py-2.5 text-foreground outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />

              <button
                type="button"
                onClick={saveName}
                disabled={savingName || !name.trim()}
                className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingName ? "Menyimpan..." : "Simpan Nama"}
              </button>
            </div>
          </div>

          {/* Upload Photo */}
          <div className="mt-5 border-t border-border pt-5">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Ganti Foto Profil
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setSelectedImage(e.target.files?.[0] ?? null);
                }}
                className="text-sm text-muted-foreground file:mr-3 file:rounded-xl file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-accent"
              />

              <button
                type="button"
                onClick={uploadPhoto}
                disabled={uploading || !selectedImage}
                className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Mengunggah..." : "Upload Foto"}
              </button>
            </div>

            {selectedImage && (
              <p className="mt-2 text-xs text-cyan-400">
                File siap diunggah: {selectedImage.name}
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
      </div>
    </AppLayout>
  );
}