import Link from "next/link";
import {
  Bug,
  ImageIcon,
  Palette,
  Clapperboard,
  FileText,
  ScanText,
  Languages,
  ArrowRight,
} from "lucide-react";

const actions = [
  {
    title: "AI Debugger",
    description: "Analyze and fix your code instantly.",
    href: "/ai-debugger",
    icon: Bug,
  },
  {
    title: "Image Prompt",
    description: "Generate prompts for AI image models.",
    href: "/image-prompt",
    icon: ImageIcon,
  },
  {
    title: "AI Design",
    description: "Create modern UI/UX ideas with AI.",
    href: "/ai-design",
    icon: Palette,
  },
  {
    title: "AI Animation",
    description: "Generate animation ideas with AI.",
    href: "/ai-animation",
    icon: Clapperboard,
  },
  {
    title: "AI Document",
    description: "Analyze PDF, DOCX, and TXT documents.",
    href: "/ai-document",
    icon: FileText,
  },
  {
    title: "AI OCR",
    description: "Extract and analyze text from images.",
    href: "/ai-ocr",
    icon: ScanText,
  },
  {
    title: "AI Translator",
    description: "Translate text into multiple languages.",
    href: "/ai-translator",
    icon: Languages,
  },
];

export default function QuickAction() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4 lg:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white lg:mb-6 lg:text-xl">
        Quick Actions
      </h2>

      <div className="space-y-3 lg:space-y-4">
        {actions.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 transition duration-300 hover:-translate-y-1 hover:border-cyan-500 hover:bg-slate-800 hover:shadow-xl lg:p-4"
            >
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="rounded-lg bg-cyan-500/10 p-2.5 lg:rounded-xl lg:p-3">
                  <Icon
  className="text-cyan-400"
  size={20}
/>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white lg:text-base">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 lg:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>

              <ArrowRight
                size={20}
                className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-400"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}