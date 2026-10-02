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
import { Sparkles, Palette, X, ChevronRight, Move } from "lucide-react";

const GREETINGS = [
  "Halo! DNA AI siap bantu semua tugas & kodinganmu hari ini! 🚀",
  "Semangat belajarnya! Jangan lupa istirahat & minum air ya ☕",
  "Keren banget tampilan web kita hari ini! Ada ide apa lagi? ✨",
  "DNA AI kecepatan penuh, siap menerima perintahmu! ⚡",
  "Mau ganti kostumku? Klik tombol 'Kustomisasi' di bawah ya! 🎨",
  "Lagi stuck koding? Yuk tanya ke AI Debugger atau AI Assistant! 💻",
  "Kamu bisa geser & pindahin posisiku ke mana aja di layar lho! 🛸",
];

const POSITION_STORAGE_KEY = "dna_companion_pos_v2";

export default function DnaCompanion() {
  const router = useRouter();
  const [config, setConfig] = useState<CompanionConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Position state (null = not initialized yet)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);

  // Drag tracking refs
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate default position docked at bottom-right
  const getDefaultPosition = (cfg: CompanionConfig | null) => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const mascotSize =
      cfg?.size === "compact" ? 52 : cfg?.size === "large" ? 84 : 68;
    const isMobile = window.innerWidth < 640;
    const defaultX = Math.max(16, window.innerWidth - mascotSize - (isMobile ? 16 : 24));
    const defaultY = Math.max(16, window.innerHeight - mascotSize - (isMobile ? 80 : 28));
    return { x: defaultX, y: defaultY };
  };

  // Initialize Position & Config
  useEffect(() => {
    const initialConfig = getCompanionConfig();
    setConfig(initialConfig);

    // Load saved position
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          !isNaN(parsed.x) &&
          !isNaN(parsed.y)
        ) {
          // Clamp to current viewport
          const mascotSize =
            initialConfig.size === "compact"
              ? 52
              : initialConfig.size === "large"
              ? 84
              : 68;
          const clampedX = Math.max(
            10,
            Math.min(window.innerWidth - mascotSize - 10, parsed.x)
          );
          const clampedY = Math.max(
            10,
            Math.min(window.innerHeight - mascotSize - 10, parsed.y)
          );
          setPosition({ x: clampedX, y: clampedY });
        } else {
          setPosition(getDefaultPosition(initialConfig));
        }
      } else {
        setPosition(getDefaultPosition(initialConfig));
      }
    } catch {
      setPosition(getDefaultPosition(initialConfig));
    }

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

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const mascotSize = 70;
        return {
          x: Math.max(10, Math.min(window.innerWidth - mascotSize - 10, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - mascotSize - 10, prev.y)),
        };
      });
    };

    window.addEventListener(COMPANION_EVENT_KEY, handleConfigChange);
    window.addEventListener(
      COMPANION_OPEN_CUSTOMIZER_EVENT,
      handleOpenCustomizer
    );
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(COMPANION_EVENT_KEY, handleConfigChange);
      window.removeEventListener(
        COMPANION_OPEN_CUSTOMIZER_EVENT,
        handleOpenCustomizer
      );
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Show a greeting once on mount if enabled
  useEffect(() => {
    if (config?.enabled) {
      const timer = setTimeout(() => {
        triggerGreeting(
          `Halo! Aku ${config.name || "DNA Buddy"}, kamu bisa geser aku kemana aja! 🛸`
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

    bubbleTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 8000);
  };

  // Drag Handlers using Pointer Events (Works seamlessly for both Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = position || getDefaultPosition(config);
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
    }

    const mascotSize =
      config?.size === "compact" ? 52 : config?.size === "large" ? 84 : 68;
    const maxX = Math.max(10, window.innerWidth - mascotSize - 10);
    const maxY = Math.max(10, window.innerHeight - mascotSize - 10);

    const newX = Math.max(10, Math.min(maxX, initialPosRef.current.x + dx));
    const newY = Math.max(10, Math.min(maxY, initialPosRef.current.y + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release error
    }

    if (hasMovedRef.current) {
      // Saved the moved position
      if (position) {
        try {
          localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
        } catch {}
      }
    } else {
      // User tapped or clicked without dragging!
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
  const currentPos = position || { x: -9999, y: -9999 };

  // Calculate bubble orientation based on mascot's position on screen
  const isNearTop = currentPos.y < 200;
  const isNearLeft = currentPos.x < 220;

  return (
    <>
      {/* FLOATING DRAGGABLE CONTAINER */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`fixed z-50 flex flex-col items-center select-none touch-none transition-transform duration-75 ${
          isDragging ? "cursor-grabbing scale-105" : "cursor-grab"
        }`}
        style={{
          left: `${currentPos.x}px`,
          top: `${currentPos.y}px`,
          visibility: position ? "visible" : "hidden",
        }}
      >
        {/* SPEECH BUBBLE */}
        {showBubble && !isDragging && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute max-w-[260px] sm:max-w-[280px] rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 z-50 ${
              isNearTop ? "top-full mt-3" : "bottom-full mb-3"
            } ${isNearLeft ? "left-0" : "right-0"}`}
          >
            {/* Pointer Arrow */}
            <div
              className={`absolute h-3 w-3 rotate-45 border-zinc-800 bg-zinc-950 ${
                isNearTop
                  ? "-top-1.5 border-t border-l"
                  : "-bottom-1.5 border-b border-r"
              } ${isNearLeft ? "left-6" : "right-6"}`}
            />

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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBubble(false);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
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
                onClick={(e) => {
                  e.stopPropagation();
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

        {/* MASCOT AVATAR */}
        <div className="relative group">
          <CompanionAvatar
            config={config}
            isFloating={!isDragging}
            className="transition-transform pointer-events-none"
          />

          {/* Mini Drag Badge Indicator */}
          <div
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-0.5 bg-zinc-900/90 border border-zinc-700/80 text-[9px] text-zinc-400 flex items-center gap-0.5 shadow-sm transition-opacity duration-200 pointer-events-none ${
              isDragging
                ? "opacity-100 text-cyan-300 border-cyan-500/50"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <Move size={8} />
            <span>Geser</span>
          </div>

          {/* Mini Quick-Open Tooltip on Hover */}
          {!showBubble && !isDragging && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 hidden group-hover:flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1 text-[11px] font-medium text-zinc-300 shadow-lg pointer-events-none backdrop-blur-sm">
              <Sparkles size={11} className="text-cyan-400" />
              <span>Geser atau Klik Aku!</span>
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
