"use client";

import React from "react";
import Image from "next/image";
import {
  CompanionConfig,
  COLOR_MAP,
} from "@/lib/companion-store";

interface CompanionAvatarProps {
  config: CompanionConfig;
  isFloating?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function CompanionAvatar({
  config,
  isFloating = false,
  className = "",
  onClick,
}: CompanionAvatarProps) {
  const { skin, color, accessory, size } = config;
  const colorMeta = COLOR_MAP[color] || COLOR_MAP.cyan;

  // Size dimensions
  const dimension =
    size === "compact"
      ? { box: "w-12 h-12", img: 32, ring: 48 }
      : size === "large"
      ? { box: "w-20 h-20", img: 52, ring: 80 }
      : { box: "w-16 h-16", img: 42, ring: 64 };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer ${dimension.box} ${
        isFloating ? "animate-[dnaFloat_3s_ease-in-out_infinite]" : ""
      } ${className}`}
      style={{
        filter: `drop-shadow(0 0 12px ${colorMeta.glow})`,
      }}
    >
      {/* =========================================
          SPECIAL ACCESSORY / SKIN TOP OVERLAYS
          ========================================= */}

      {/* 1. Halo (Accessory) */}
      {accessory === "halo" && (
        <div
          className="absolute -top-3.5 z-20 h-2.5 w-10 rounded-full border-2 border-amber-300 bg-amber-400/30 animate-pulse shadow-[0_0_10px_#fde047]"
          style={{ transform: "rotate(-6deg)" }}
        />
      )}

      {/* 2. Crown (Accessory) */}
      {accessory === "crown" && (
        <div className="absolute -top-4 z-20 text-lg leading-none animate-bounce drop-shadow-[0_2px_8px_rgba(245,158,11,0.8)]">
          👑
        </div>
      )}

      {/* 3. Scholar Mortarboard (Skin: scholar) */}
      {skin === "scholar" && (
        <div className="absolute -top-3 z-20 text-xl leading-none drop-shadow-md">
          🎓
        </div>
      )}

      {/* 4. Cyber Neko Ears (Skin: cyber-neko) */}
      {skin === "cyber-neko" && (
        <>
          {/* Left Ear */}
          <div
            className="absolute -top-2 left-0.5 z-10 w-4 h-4 rounded-tl-lg bg-gradient-to-tr from-zinc-900 to-pink-500 border border-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          />
          {/* Right Ear */}
          <div
            className="absolute -top-2 right-0.5 z-10 w-4 h-4 rounded-tr-lg bg-gradient-to-tl from-zinc-900 to-pink-500 border border-pink-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          />
        </>
      )}

      {/* 5. Ninja Headband (Skin: ninja-shadow) */}
      {skin === "ninja-shadow" && (
        <div className="absolute top-1 z-20 flex items-center justify-center w-full">
          <div className="h-2 w-full bg-red-600/90 rounded-sm border-t border-b border-red-400 shadow-[0_0_6px_#ef4444] flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      )}

      {/* 6. Gamer Headset (Skin: gamer-bot) */}
      {skin === "gamer-bot" && (
        <>
          {/* Headband arch */}
          <div className="absolute -top-2 z-10 w-full h-3 border-t-4 border-cyan-400 rounded-t-full shadow-[0_0_8px_#06b6d4]" />
          {/* Left Earpad */}
          <div className="absolute -left-1.5 top-2.5 z-20 w-2.5 h-6 rounded-l-full bg-zinc-900 border-2 border-cyan-400 shadow-[0_0_6px_#06b6d4]" />
          {/* Right Earpad */}
          <div className="absolute -right-1.5 top-2.5 z-20 w-2.5 h-6 rounded-r-full bg-zinc-900 border-2 border-cyan-400 shadow-[0_0_6px_#06b6d4]" />
        </>
      )}

      {/* =========================================
          MAIN BASE CONTAINER (CYBER CAPSULE / ORB)
          ========================================= */}
      <div
        className={`relative flex items-center justify-center w-full h-full rounded-2xl p-1.5 overflow-hidden transition-all duration-300 ${
          skin === "pixel-pet"
            ? "border-2 border-dashed bg-zinc-950 font-mono"
            : "rounded-2xl border-2 bg-zinc-950/90 backdrop-blur-md"
        } ${colorMeta.border}`}
        style={{
          boxShadow: `0 0 16px ${colorMeta.glow}, inset 0 0 12px ${colorMeta.glow}`,
        }}
      >
        {/* Background Cyber Grid effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

        {/* Outer Pulsing Aura Ring */}
        <div
          className="absolute inset-0 rounded-2xl opacity-40 animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colorMeta.glow} 0%, transparent 70%)`,
          }}
        />

        {/* DEFAULT WEB LOGO (CORE MASCOT IDENTITY) */}
        <div className="relative z-10 flex items-center justify-center">
          <Image
            src="/logo-dna.png"
            alt="DNA AI Mascot"
            width={dimension.img}
            height={dimension.img}
            className={`object-contain transition-transform duration-300 hover:scale-110 ${
              skin === "pixel-pet" ? "image-rendering-pixelated" : ""
            }`}
            priority
          />
        </div>

        {/* =========================================
            EYE / VISOR / GLASSES ACCESSORIES
            ========================================= */}
        {accessory === "glasses" && (
          <div className="absolute top-[35%] z-20 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-0.5 bg-black px-1.5 py-0.5 rounded-sm border border-cyan-400 shadow-[0_0_8px_#06b6d4]">
              <span className="w-2.5 h-1.5 bg-cyan-400/90 rounded-[1px]" />
              <span className="w-1 h-0.5 bg-zinc-600" />
              <span className="w-2.5 h-1.5 bg-cyan-400/90 rounded-[1px]" />
            </div>
          </div>
        )}

        {/* Cyber Neko Whiskers */}
        {skin === "cyber-neko" && (
          <>
            <div className="absolute left-0.5 top-[52%] h-0.5 w-1.5 bg-pink-400 shadow-[0_0_4px_#f43f5e]" />
            <div className="absolute right-0.5 top-[52%] h-0.5 w-1.5 bg-pink-400 shadow-[0_0_4px_#f43f5e]" />
          </>
        )}

        {/* Scanline for Pixel Pet */}
        {skin === "pixel-pet" && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none opacity-50" />
        )}
      </div>

      {/* =========================================
          SPARKS PARTICLES (Accessory: sparks)
          ========================================= */}
      {accessory === "sparks" && (
        <>
          <span className="absolute -top-1 -right-2 text-xs animate-ping text-amber-300">
            ✨
          </span>
          <span className="absolute -bottom-1 -left-2 text-xs animate-pulse text-cyan-300">
            ⚡
          </span>
        </>
      )}

      {/* Online Cyber Indicator Dot */}
      <span
        className={`absolute -bottom-1 -right-1 z-20 h-3 w-3 rounded-full border-2 border-zinc-950 ${colorMeta.bg} animate-pulse`}
        title="DNA Mascot Online"
      />
    </div>
  );
}
