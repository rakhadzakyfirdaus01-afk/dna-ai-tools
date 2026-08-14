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
} from "lucide-react";
import { toast } from "sonner";

type SettingsData = {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  animations: boolean;
  autoSave: boolean;
};

export default function SettingsPage() {
  const {
  theme,
  setTheme,
  resolvedTheme,
} = useTheme();

  const [notification, setNotification] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

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
  }, []);

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

        <div className="grid gap-3 md:grid-cols-3">

          {/* Light */}
          <button
            onClick={() => setTheme("light")}
            className={`rounded-xl border p-4 transition ${
              theme === "light"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Sun className="mx-auto mb-2 text-white" />

            <p className="text-white">
              Light
            </p>

          </button>

          {/* Dark */}
          <button
            onClick={() => setTheme("dark")}
            className={`rounded-xl border p-4 transition ${
              theme === "dark"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Moon className="mx-auto mb-2 text-white" />

            <p className="text-white">
              Dark
            </p>

          </button>

          {/* System */}
          <button
            onClick={() => setTheme("system")}
            className={`rounded-xl border p-4 transition ${
              theme === "system"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Monitor className="mx-auto mb-2 text-white" />

            <p className="text-white">
              System
            </p>

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