"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/shared/language-provider";

import {
  LayoutDashboard,
  Bug,
  ImageIcon,
  Palette,
  Clapperboard,
  FileText,
  ScanText,
  Languages,
  History,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const menus = [
    {
      title: t.dashboard,
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t.debugger,
      href: "/ai-debugger",
      icon: Bug,
    },
    {
      title: t.imagePrompt,
      href: "/image-prompt",
      icon: ImageIcon,
    },
    {
      title: t.design,
      href: "/ai-design",
      icon: Palette,
    },
    {
      title: t.animation,
      href: "/ai-animation",
      icon: Clapperboard,
    },
    {
      title: t.document,
      href: "/ai-document",
      icon: FileText,
    },
    {
      title: t.ocr,
      href: "/ai-ocr",
      icon: ScanText,
    },
    {
      title: t.translator,
      href: "/ai-translator",
      icon: Languages,
    },
    {
      title: t.history,
      href: "/history",
      icon: History,
    },
    {
      title: t.settings,
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-800 bg-[#0B1120]">
      <div className="border-b border-slate-800 p-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo-dna.png"
            alt="DNA Logo"
            className="h-12 w-12 rounded-2xl object-cover transition duration-300 hover:scale-110"
          />

          <div>
            <h1 className="text-xl font-bold text-white">
              DNA AI
            </h1>

            <p className="text-sm text-slate-400">
              {t.advertisingPlatform}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const active = pathname === menu.href;

          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 ${
                active
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon
                size={22}
                className="transition duration-300 group-hover:scale-110"
              />

              <span className="font-medium">
                {menu.title}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          <h3 className="text-lg font-bold text-white">
            Gemini AI
          </h3>

          <p className="mt-2 text-sm text-cyan-100">
            {t.geminiDescription}
          </p>

          <button className="mt-5 w-full rounded-xl bg-white py-3 font-semibold text-slate-900 transition hover:scale-105">
            {t.connected}
          </button>
        </div>
      </div>
    </aside>
  );
}