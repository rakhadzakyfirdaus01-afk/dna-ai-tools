"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import LanguageSwitcher from "@/components/shared/language-switcher";
import { useLanguage } from "@/components/shared/language-provider";

import {
  Search,
  Bell,
  Moon,
  Settings,
  Sparkles,
  Menu,
} from "lucide-react";

interface HeaderProps {
  mobileMenu: boolean;
  setMobileMenu: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

export default function Header({
  mobileMenu,
  setMobileMenu,
}: HeaderProps) {
  const router = useRouter();

  const { t } = useLanguage();

  const { data: session } = useSession();

     const [profileImage, setProfileImage] = useState<string | null>(
  session?.user?.image ?? null
);

useEffect(() => {
  async function loadProfileImage() {
    const response = await fetch("/api/profile");

    if (!response.ok) return;

    const data = await response.json();

    if (data.image) {
      setProfileImage(data.image);
    }
  }

  loadProfileImage();
}, []);

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);

  const menus = [
    {
      name: "Dashboard",
      path: "/dashboard",
    },
    {
      name: "AI Debugger",
      path: "/ai-debugger",
    },
    {
      name: "Image Prompt",
      path: "/image-prompt",
    },
    {
      name: "AI Design",
      path: "/ai-design",
    },
    {
      name: "AI Animation",
      path: "/ai-animation",
    },
    {
      name: "History",
      path: "/history",
    },
    {
      name: "Settings",
      path: "/settings",
    },
  ];

  const result = menus.filter((item) =>
    item.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0F172A]/90 backdrop-blur">

      <div className="flex h-14 items-center justify-between px-3 lg:h-20 lg:px-8">

        <div className="flex items-center gap-2">

          <button
  onClick={() => setMobileMenu(!mobileMenu)}
  className="rounded-xl bg-slate-900 p-2 transition hover:bg-slate-800 lg:hidden"
>
            <Menu size={22} />
          </button>

          <div>

            <p className="hidden text-xs text-slate-400 lg:block lg:text-sm">
              {today}
            </p>

            <h1 className="mt-1 text-lg font-bold text-white lg:text-2xl">
              DNA AI Platform
            </h1>

          </div>

        </div>

        <div className="flex items-center gap-1.5 lg:gap-4">

          <div className="scale-90 lg:scale-100">
          <LanguageSwitcher />
         </div>

          <div className="relative hidden lg:block">

            <div className="flex h-11 w-80 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4">

              <Search
                size={18}
                className="text-slate-500"
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={t.search}
                className="w-full bg-transparent text-white outline-none"
              />

            </div>

            {open && search && (

              <div className="absolute left-0 top-14 w-80 rounded-xl border border-slate-700 bg-[#0F172A] p-2">

                {result.map((item) => (

                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path);
                      setSearch("");
                      setOpen(false);
                    }}
                    className="w-full rounded-lg px-4 py-3 text-left text-white hover:bg-slate-800"
                  >
                    {item.name}
                  </button>

                ))}

              </div>

            )}

          </div>
                    <button className="rounded-lg bg-slate-900 p-2.5 transition hover:bg-slate-800 lg:rounded-xl lg:p-3">
            <Bell size={20} />
          </button>

          <button className="hidden rounded-xl bg-slate-900 p-3 lg:block">
            <Moon size={20} />
          </button>

          <button className="hidden rounded-xl bg-slate-900 p-3 lg:block">
            <Settings size={20} />
          </button>

          <button className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold lg:flex">

            <Sparkles size={18} />

            {t.geminiReady}

          </button>

          <div className="flex items-center gap-3">

            <div className="hidden text-right lg:block">

              <p className="text-sm font-semibold text-white">
                {session?.user?.name ?? "User"}
              </p>

              <p className="text-xs text-cyan-400">
                {t.user}
              </p>

              <button
                onClick={() =>
                  signOut({
                    callbackUrl: "/login",
                  })
                }
                className="text-xs text-red-400"
              >
                {t.logout}
              </button>

            </div>

            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-bold lg:h-12 lg:w-12 lg:text-lg">

              {profileImage ? (
           <Image
            src={profileImage}
           alt="Profile"
           width={48}
           height={48}
           className="h-full w-full object-cover"
           />
           ) : (
            session?.user?.name?.charAt(0) ?? "U"
           )}

            </div>

          </div>

        </div>

      </div>
          </header>
  );
}