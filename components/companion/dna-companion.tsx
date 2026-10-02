"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CompanionConfig,
  COMPANION_EVENT_KEY,
  COMPANION_OPEN_CUSTOMIZER_EVENT,
  getCompanionConfig,
  COLOR_MAP,
} from "@/lib/companion-store";
import CompanionAvatar from "./companion-avatar";
import CompanionModal from "./companion-modal";
import { Sparkles, MessageSquare, Palette, X, ChevronRight } from "lucide-react";

const GREETINGS = [
  "Halo! DNA AI siap bantu semua tugas & kodinganmu hari ini! 🚀",
  "Semangat belajarnya! Jangan lupa istirahat & minum air ya ☕",
  "Keren banget tampilan web kita hari ini! Ada ide apa lagi? ✨",
  "DNA AI kecepatan penuh, siap menerima perintahmu! ⚡",
  "Mau ganti kostumku? Klik tombol 'Kustomisasi' di bawah ya! 🎨",
  "Lagi stuck koding? Yuk tanya ke AI Debugger atau AI Assistant! 💻",
  "Semua fitur di DNA AI gratis & siap kamu pakai kapan saja! 🔥",
];

export default function DnaCompanion() {
  const router = useRouter();
  const [config, setConfig] = useState<CompanionConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with store & events
  useEffect(() => {
    // Initial load
    setConfig(getCompanionConfig());

    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<CompanionConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getCompanionConfig());
      }
    };

    const handleOpenCustomizer = () => {
      setIsModalOpen(true);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dna_companion_config_v1") {
        setConfig(getCompanionConfig());
      }
    };

    window.addEventListener(COMPANION_EVENT_KEY, handleConfigChange);
    window.addEventListener(
      COMPANION_OPEN_CUSTOMIZER_EVENT,
      handleOpenCustomizer
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(COMPANION_EVENT_KEY, handleConfigChange);
      window.removeEventListener(
        COMPANION_OPEN_CUSTOMIZER_EVENT,
        handleOpenCustomizer
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Show a greeting once on mount if enabled
  useEffect(() => {
    if (config?.enabled) {
      const timer = setTimeout(() => {
        triggerGreeting(
          `Halo! Aku ${config.name || "DNA Buddy"}, maskot setiamu di DNA AI!`
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [config?.enabled]);

  const triggerGreeting = (customText?: string) => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }

    const text =
      customText ||
      GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setBubbleText(text);
    setShowBubble(true);

    // Auto dismiss after 8 seconds
    bubbleTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 8000);
  };

  const handleAvatarClick = () => {
    if (showBubble) {
      triggerGreeting();
    } else {
      triggerGreeting();
    }
  };

  // If companion is disabled in settings or not yet loaded, render nothing!
  if (!config || !config.enabled) {
    return (
      <CompanionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    );
  }

  const colorMeta = COLOR_MAP[config.color] || COLOR_MAP.cyan;

  return (
    <>
      {/* FLOATING COMPANION DOCKED AT BOTTOM-RIGHT */}
      <div
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end select-none pointer-events-auto"
        style={{ touchAction: "none" }}
      >
        {/* SPEECH BUBBLE */}
        {showBubble && (
          <div className="relative mb-3 max-w-[260px] sm:max-w-[280px] rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Pointer Arrow */}
            <div className="absolute -bottom-2 right-6 h-3 w-3 rotate-45 border-b border-r border-zinc-800 bg-zinc-950" />

            {/* Header info */}
            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-zinc-800/60">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                <span
                  className="h-2 w-2 rounded-full animate-ping"
                  style={{ backgroundColor: colorMeta.hex }}
                />
                {config.name || "DNA Buddy"}
              </span>
              <button
                type="button"
                onClick={() => setShowBubble(false)}
                className="text-zinc-400 hover:text-white transition p-0.5 rounded-md hover:bg-zinc-800"
              >
                <X size={12} />
              </button>
            </div>

            {/* Bubble text content */}
            <p className="text-xs leading-relaxed text-zinc-300">
              {bubbleText}
            </p>

            {/* Action buttons */}
            <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => {
                  setShowBubble(false);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition hover:underline"
              >
                <Palette size={12} />
                <span>Kustomisasi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBubble(false);
                  router.push("/ai-assistant");
                }}
                className="flex items-center gap-0.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition"
              >
                <span>Chat AI</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* MASCOT AVATAR BUTTON */}
        <div className="relative group">
          <CompanionAvatar
            config={config}
            isFloating={true}
            onClick={handleAvatarClick}
            className="hover:scale-105 active:scale-95 transition-transform"
          />

          {/* Mini Quick-Open Tooltip on Hover */}
          {!showBubble && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 shadow-lg pointer-events-none backdrop-blur-sm">
              <Sparkles size={11} className="text-cyan-400" />
              <span>{config.name || "DNA Buddy"} (Klik Aku!)</span>
            </div>
          )}
        </div>
      </div>

      {/* CUSTOMIZER MODAL */}
      <CompanionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
