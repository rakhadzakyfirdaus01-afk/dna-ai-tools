"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import ProfilePage from "@/app/profile/page";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  Palette,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [notification, setNotification] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

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
          ? "Tema Gelap (Dark) aktif"
          : "Tema Terang (Light) aktif"
      );
    } catch {
      // Abaikan error background auto-save
    }
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");

        if (!res.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await res.json();

        const settings = data.settings;

        if (!settings) return;

        setTheme(settings.theme);
        setNotification(settings.notifications);
        setAnimations(settings.animations);
        setAutoSave(settings.autoSave);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [setTheme]);

  async function saveSettings() {
    try {
      setSaving(true);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          theme,
          notifications: notification,
          animations,
          autoSave,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to save settings"
        );
      }

      toast.success("Settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-400">
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3 lg:items-center">

        <Settings
          size={26}
          className="text-cyan-400 lg:h-[30px] lg:w-[30px]"
        />

        <div>

          <h1 className="text-2xl font-bold text-white lg:text-3xl">
            Settings
          </h1>

          <p className="text-sm text-slate-400 lg:text-base">
            Customize your AI workspace.
          </p>

        </div>

      </div>
             <ProfilePage />
      {/* Appearance */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:p-6">

        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white lg:mb-6 lg:text-xl">

          <Palette size={20} />

          Appearance

        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Sistem (Biru Navy) */}
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
              theme === "system"
                ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60"
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
                <h3 className="font-semibold text-white">Sistem</h3>
                <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  Biru Navy
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tema bawaan DNA AI dengan nuansa biru navy modern
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-slate-800/80">
              <span className="h-3 w-3 rounded-full bg-[#0B1120] border border-slate-700" title="#0B1120" />
              <span className="h-3 w-3 rounded-full bg-[#0F172A] border border-slate-700" title="#0F172A" />
              <span className="h-3 w-3 rounded-full bg-[#06B6D4]" title="Cyan Accent" />
              <span className="ml-auto text-[10px] text-slate-400">Default DNA AI</span>
            </div>
          </button>

          {/* Gelap (Dark) */}
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
              theme === "dark"
                ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60"
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
                <h3 className="font-semibold text-white">Gelap</h3>
                <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                  OLED Black
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Hitam pekat minimalis, hemat daya dan nyaman di mata
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-slate-800/80">
              <span className="h-3 w-3 rounded-full bg-black border border-zinc-700" title="Pure Black" />
              <span className="h-3 w-3 rounded-full bg-zinc-900 border border-zinc-700" title="Zinc 900" />
              <span className="h-3 w-3 rounded-full bg-[#06B6D4]" title="Cyan Accent" />
              <span className="ml-auto text-[10px] text-slate-400">Pitch Black</span>
            </div>
          </button>

          {/* Terang (Light) */}
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            className={`relative flex flex-col justify-between rounded-2xl border p-5 text-left transition duration-200 ${
              theme === "light"
                ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/5"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/60"
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
                <h3 className="font-semibold text-white">Terang</h3>
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  Clean White
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Latar putih bersih dan cerah dengan kontras tinggi
              </p>
            </div>

            <div className="mt-4 flex items-center gap-1.5 pt-3 border-t border-slate-800/80">
              <span className="h-3 w-3 rounded-full bg-white border border-slate-300" title="White" />
              <span className="h-3 w-3 rounded-full bg-slate-100 border border-slate-300" title="Slate 100" />
              <span className="h-3 w-3 rounded-full bg-[#0891B2]" title="Cyan Accent" />
              <span className="ml-auto text-[10px] text-slate-400">Light Mode</span>
            </div>
          </button>
        </div>

      </div>

      {/* Preferences */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:p-6">

        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white lg:mb-6 lg:text-xl">

          <Bell size={20} />

          Preferences

        </h2>

        <div className="space-y-5">

          {/* Notifications */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3 className="font-medium text-white">
                Notifications
              </h3>

              <p className="text-sm text-slate-400">
                Enable toast notifications.
              </p>

            </div>

            <input
              type="checkbox"
              checked={notification}
              onChange={(e) =>
                setNotification(e.target.checked)
              }
              className="h-5 w-5 self-start accent-cyan-500 lg:self-auto"
            />

          </div>

          {/* Animations */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3 className="font-medium text-white">
                Animations
              </h3>

              <p className="text-sm text-slate-400">
                Enable interface animations.
              </p>

            </div>

            <input
              type="checkbox"
              checked={animations}
              onChange={(e) =>
                setAnimations(e.target.checked)
              }
              className="h-5 w-5 self-start accent-cyan-500 lg:self-auto"
            />

          </div>

          {/* Auto Save */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3 className="font-medium text-white">
                Auto Save
              </h3>

              <p className="text-sm text-slate-400">
                Automatically save AI history.
              </p>

            </div>

            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) =>
                setAutoSave(e.target.checked)
              }
              className="h-5 w-5 self-start accent-cyan-500 lg:self-auto"
            />

          </div>

        </div>

      </div>

      {/* Privacy */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:p-6">

        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white lg:mb-6 lg:text-xl">

          <Shield size={20} />

          Privacy

        </h2>

        <p className="text-sm text-slate-400 lg:text-base">
          Your prompts and generated results are stored securely
          and are only accessible from your account.
        </p>

      </div>

      {/* Save */}
      <div className="flex">

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 lg:ml-auto lg:w-auto"
        >

          <Save size={18} />

          {saving ? "Saving..." : "Save Settings"}

        </button>

      </div>

    </div>
  );
}