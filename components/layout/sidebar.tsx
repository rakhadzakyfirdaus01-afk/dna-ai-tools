"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/shared/language-provider";

import {
  Bug,
  Palette,
  Clapperboard,
  History,
  Settings,
} from "lucide-react";

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  const { t } = useLanguage();

  const menus = [
    {
      title: "AI Asisten",
      href: "/ai-assistant",
      icon: Bug,
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
    <aside className="flex h-full w-[280px] flex-col border-r border-slate-800 bg-[#0B1120] shadow-2xl lg:h-screen lg:w-72">
      <div className="border-b border-slate-800 p-4 lg:p-6">
        <div className="flex items-center gap-2 lg:gap-3">
          <img
            src="/logo-dna.png"
            alt="DNA Logo"
            className="h-10 w-10 rounded-xl object-cover transition duration-300 hover:scale-110 lg:h-12 lg:w-12 lg:rounded-2xl"
          />

          <div>
            <h1 className="text-lg font-bold text-white lg:text-xl">
              DNA AI
            </h1>

            <p className="text-xs text-slate-400 lg:text-sm">
              {t.advertisingPlatform}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 lg:space-y-2 lg:p-4">
        {menus.map((menu) => {
          const Icon = menu.icon;

          const active =
            pathname === menu.href ||
            pathname.startsWith(`${menu.href}/`);

          return (
            <Link
              key={menu.href}
              href={menu.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 active:scale-[0.98] lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 ${
                active
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon
                size={20}
                className="transition duration-300 group-hover:scale-110 group-active:scale-95"
              />

              <span className="truncate text-sm font-medium lg:text-base">
                {menu.title}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:block lg:p-4">
        <div className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-xl lg:rounded-2xl lg:p-5">
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