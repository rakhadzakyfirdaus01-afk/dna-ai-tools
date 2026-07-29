"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  icon: React.ReactNode;
  title: string;
}

export default function NavItem({
  href,
  icon,
  title,
}: Props) {
  const pathname = usePathname();

  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {icon}

      <span className="font-medium">{title}</span>
    </Link>
  );
}