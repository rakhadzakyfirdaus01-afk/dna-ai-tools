"use client";

import { useState } from "react";
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

export default function SettingsPage() {
  const [theme, setTheme] = useState("system");

  const [notification, setNotification] =
    useState(true);

  const [animations, setAnimations] =
    useState(true);

  const [autoSave, setAutoSave] =
    useState(true);

  function saveSettings() {
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-5 lg:space-y-6">

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

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:p-6">

        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white lg:mb-6 lg:text-xl">

          <Palette size={20} />

          Appearance

        </h2>

        <div className="grid gap-3 md:grid-cols-3">

          <button
            onClick={() => setTheme("light")}
            className={`rounded-xl border p-4 transition ${
              theme === "light"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Sun className="mx-auto mb-2" />

            <p className="text-white">
              Light
            </p>

          </button>

          <button
            onClick={() => setTheme("dark")}
            className={`rounded-xl border p-4 transition ${
              theme === "dark"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Moon className="mx-auto mb-2" />

            <p className="text-white">
              Dark
            </p>

          </button>

          <button
            onClick={() => setTheme("system")}
            className={`rounded-xl border p-4 transition ${
              theme === "system"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-slate-700"
            }`}
          >

            <Monitor className="mx-auto mb-2" />

            <p className="text-white">
              System
            </p>

          </button>

        </div>

      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 lg:p-6">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white lg:mb-6 lg:text-xl">

          <Bell size={20} />

          Preferences

        </h2>

        <div className="space-y-5">

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
              className="h-5 w-5 self-start lg:self-auto"
            />

          </div>

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
              className="h-5 w-5 self-start lg:self-auto"
            />

          </div>

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
              className="h-5 w-5 self-start lg:self-auto"
            />

          </div>

        </div>

      </div>

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

      <div className="flex">

        <button
          onClick={saveSettings}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-medium text-white transition hover:bg-cyan-500 lg:ml-auto lg:w-auto"
        >

          <Save size={18} />

          Save Settings

        </button>

      </div>
          </div>
  );
}