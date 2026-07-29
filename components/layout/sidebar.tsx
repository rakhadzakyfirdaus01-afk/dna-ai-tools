"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bug,
  ImageIcon,
  Palette,
  Clapperboard,
  History,
  Settings,
} from "lucide-react";

const menus = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "AI Debugger",
    href: "/ai-debugger",
    icon: Bug,
  },
  {
    title: "Image Prompt",
    href: "/image-prompt",
    icon: ImageIcon,
  },
  {
    title: "AI Design",
    href: "/ai-design",
    icon: Palette,
  },
  {
    title: "AI Animation",
    href: "/ai-animation",
    icon: Clapperboard,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

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
              Advertising Platform
            </p>
          </div>

        </div>

      </div>


      <nav className="flex-1 space-y-2 p-4">

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
            Ready to generate text, prompts, UI designs, and AI animations.
          </p>


          <button className="mt-5 w-full rounded-xl bg-white py-3 font-semibold text-slate-900 transition hover:scale-105">
            Connected
          </button>


        </div>

      </div>


    </aside>
  );
}