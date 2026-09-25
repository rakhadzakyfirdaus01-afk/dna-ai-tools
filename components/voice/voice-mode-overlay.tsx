"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, X, Send, Sparkles, Volume2, ArrowLeft } from "lucide-react";

export type VoiceModeStatus = "idle" | "listening" | "thinking" | "speaking" | "paused";

interface VoiceModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  status: VoiceModeStatus;
  voiceLevel: number; // 0 to 100
  latestReply?: string;
  latestAssistantText?: string;
  isPaused: boolean;
  onTogglePause: () => void;
  onSendNow?: () => void;
  onManualSend?: () => void;
  onStopSpeaking?: () => void;
  locale?: "id" | "en";
}

export function VoiceModeOverlay({
  isOpen,
  onClose,
  status,
  voiceLevel,
  latestReply = "",
  latestAssistantText = "",
  isPaused,
  onTogglePause,
  onSendNow,
  onManualSend,
  onStopSpeaking,
  locale = "id",
}: VoiceModeOverlayProps) {
  const isEnglish = locale === "en";
  const replyText = latestReply || latestAssistantText;
  const handleSend = onSendNow || onManualSend || (() => {});

  // Prevent scrolling when voice overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Status configuration
  const statusConfig = {
    listening: {
      badge: isEnglish ? "Listening..." : "Mendengarkan...",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      dotColor: "bg-emerald-400 animate-ping",
      hint: isEnglish
        ? "Speak naturally. AI answers automatically when you finish."
        : "Bicaralah dengan santai. AI akan langsung menjawab setelah kamu selesai bicara.",
    },
    thinking: {
      badge: isEnglish ? "Thinking..." : "Sedang berpikir...",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      dotColor: "bg-purple-400 animate-pulse",
      hint: isEnglish
        ? "AI is preparing the response..."
        : "DNA AI sedang menyiapkan jawaban terbaik untukmu...",
    },
    speaking: {
      badge: isEnglish ? "AI is speaking..." : "DNA AI sedang berbicara...",
      badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      dotColor: "bg-cyan-400 animate-pulse",
      hint: isEnglish
        ? "Listen to the response, or tap the screen to interrupt."
        : "Dengarkan jawaban AI, atau ketuk tombol untuk menghentikan.",
    },
    paused: {
      badge: isEnglish ? "Paused" : "Dijeda",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      dotColor: "bg-amber-400",
      hint: isEnglish
        ? "Voice mode paused. Tap microphone below to resume."
        : "Percakapan dijeda. Ketuk ikon mikrofon di bawah untuk melanjutkan.",
    },
    idle: {
      badge: isEnglish ? "Ready" : "Siap",
      badgeColor: "bg-slate-700/30 text-slate-400 border-slate-700/40",
      dotColor: "bg-slate-500",
      hint: isEnglish
        ? "Tap the microphone below to begin conversation."
        : "Ketuk ikon mikrofon di bawah untuk memulai percakapan.",
    },
  }[status];

  // Dynamic scale calculation for fluid bubble animation
  const baseScale = status === "listening" ? 1 + (voiceLevel / 100) * 0.35 : status === "speaking" ? 1.08 : 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#040814] text-white backdrop-blur-2xl transition-all duration-300 animate-in fade-in">
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] transition-all duration-700 ${
            status === "thinking"
              ? "h-[450px] w-[450px] bg-purple-600/25"
              : status === "speaking"
              ? "h-[500px] w-[500px] bg-cyan-500/25"
              : "h-[400px] w-[400px] bg-blue-600/20"
          }`}
        />
      </div>

      {/* TOP BAR */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 backdrop-blur-md transition hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          <span>{isEnglish ? "Back to Chat" : "Kembali ke Chat"}</span>
        </button>

        {/* STATUS PILL */}
        <div
          className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all duration-300 ${statusConfig.badgeColor}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusConfig.dotColor}`} />
          <span>{statusConfig.badge}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 sm:inline">
            DNA AI Suara
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/15"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* CENTER STAGE: THE CHATGPT-STYLE LIQUID GLOWING ORB WITH LOGO */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="relative flex items-center justify-center">
          {/* RIPPLE SOUND WAVES (EXPANDING WHEN SPEAKING OR LISTENING) */}
          {(status === "listening" || status === "speaking") && (
            <>
              <div
                className="absolute rounded-full border border-cyan-400/20 animate-ping"
                style={{
                  width: `${240 + voiceLevel * 1.2}px`,
                  height: `${240 + voiceLevel * 1.2}px`,
                  animationDuration: "2s",
                }}
              />
              <div
                className="absolute rounded-full border border-blue-500/20 animate-pulse"
                style={{
                  width: `${290 + voiceLevel * 1.5}px`,
                  height: `${290 + voiceLevel * 1.5}px`,
                }}
              />
            </>
          )}

          {/* FLUID GELEMBUNG (ORB CONTAINER) */}
          <div
            className={`relative flex items-center justify-center rounded-full transition-transform duration-150 ease-out shadow-[0_0_80px_rgba(6,182,212,0.4)] ${
              status === "thinking"
                ? "animate-pulse shadow-[0_0_90px_rgba(168,85,247,0.5)]"
                : status === "speaking"
                ? "shadow-[0_0_100px_rgba(14,165,233,0.5)]"
                : ""
            }`}
            style={{
              width: "180px",
              height: "180px",
              transform: `scale(${baseScale})`,
              background:
                status === "thinking"
                  ? "radial-gradient(circle at 35% 35%, #c084fc 0%, #7e22ce 55%, #3b0764 100%)"
                  : status === "speaking"
                  ? "radial-gradient(circle at 35% 35%, #67e8f9 0%, #0284c7 55%, #082f49 100%)"
                  : "radial-gradient(circle at 35% 35%, #a5f3fc 0%, #06b6d4 40%, #1e40af 80%, #020617 100%)",
            }}
          >
            {/* INNER REFLECTIVE HIGHLIGHT (LIQUID BUBBLE SHINE) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 via-transparent to-black/30 pointer-events-none" />

            {/* WEB LOGO INSIDE THE BUBBLE */}
            <div className="relative z-10 flex h-20 w-20 items-center justify-center transition-transform duration-300">
              <Image
                src="/logo-dna.png"
                alt="DNA AI Logo"
                width={70}
                height={70}
                priority
                className={`object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${
                  status === "thinking" ? "animate-spin" : "animate-bounce"
                }`}
                style={{
                  animationDuration: status === "thinking" ? "4s" : "3s",
                }}
              />
            </div>
          </div>
        </div>

        {/* HINT & CAPTION TEXT */}
        <div className="mt-10 max-w-md">
          <p className="text-sm font-medium text-slate-300">{statusConfig.hint}</p>

          {/* LATEST AI ANSWER PREVIEW (IF AVAILABLE) */}
          {status === "speaking" && replyText && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-cyan-200/90 backdrop-blur-md max-h-32 overflow-y-auto">
              {replyText}
            </div>
          )}
        </div>
      </main>

      {/* BOTTOM CONTROL BAR */}
      <footer className="relative z-10 flex flex-col items-center pb-8 pt-4">
        <div className="flex items-center gap-4 rounded-full border border-white/15 bg-slate-900/80 px-6 py-3.5 shadow-2xl backdrop-blur-xl">
          {/* MUTE / PAUSE BUTTON */}
          <button
            type="button"
            onClick={onTogglePause}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isPaused
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title={isPaused ? "Lanjutkan bicara" : "Jeda sementara"}
          >
            {isPaused ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* STOP SPEAKING BUTTON (WHEN AI IS TALKING) */}
          {status === "speaking" && onStopSpeaking && (
            <button
              type="button"
              onClick={onStopSpeaking}
              className="flex h-12 items-center gap-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 px-4 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/30"
            >
              <Volume2 size={18} />
              <span>{isEnglish ? "Stop Audio" : "Hentikan Suara"}</span>
            </button>
          )}

          {/* MANUAL SEND (IF USER DOES NOT WANT TO WAIT 1.5s SILENCE) */}
          {status === "listening" && (
            <button
              type="button"
              onClick={handleSend}
              className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-xs font-semibold text-white shadow-lg transition hover:brightness-110"
              title="Kirim Sekarang"
            >
              <Send size={16} />
              <span>{isEnglish ? "Send Now" : "Kirim Sekarang"}</span>
            </button>
          )}

          {/* CLOSE VOICE MODE */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-red-500/20 hover:text-red-400"
            title="Keluar dari Mode Suara"
          >
            <X size={20} />
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          {isEnglish
            ? "DNA AI Voice Mode • Auto silence detection enabled"
            : "Mode Suara DNA AI • Otomatis mendeteksi saat selesai bicara"}
        </p>
      </footer>
    </div>
  );
}
