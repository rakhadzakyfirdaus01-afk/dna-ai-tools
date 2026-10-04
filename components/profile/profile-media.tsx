"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, Video, Image as ImageIcon, Flame } from "lucide-react";

/**
 * Deteksi apakah URL merupakan format video atau media live
 */
export function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".m4v") ||
    url.includes("/video/upload/") ||
    url.includes("resource_type=video")
  );
}

/**
 * Deteksi apakah URL merupakan file GIF animasi
 */
export function isGifMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return cleanUrl.endsWith(".gif");
}

export interface ProfileAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number; // width & height in px
  className?: string;
  showLiveBadge?: boolean;
  priority?: boolean;
}

/**
 * Komponen Avatar Cerdas:
 * Mendukung foto biasa (JPG, PNG, WebP) maupun Foto/Video Profil LIVE (MP4, WebM, GIF)
 * seperti fitur Video Profil di TikTok.
 */
export function ProfileAvatar({
  src,
  alt = "Profile Avatar",
  size = 96,
  className = "",
  showLiveBadge = true,
}: ProfileAvatarProps) {
  const isVideo = isVideoMediaUrl(src);
  const isGif = isGifMediaUrl(src);
  const isLive = isVideo || isGif;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may need muted
      });
    }
  }, [isVideo, src]);

  const displaySrc = src || "/logo-dna.png";

  return (
    <div
      className={`relative inline-block overflow-hidden rounded-full shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={displaySrc}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={displaySrc}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {/* Badge "LIVE" Gaya TikTok jika foto profil berupa video/GIF */}
      {isLive && showLiveBadge && (
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center pointer-events-none pb-0.5">
          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-[9px] font-black tracking-wider text-white uppercase shadow-md border border-white/20 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
            LIVE
          </span>
        </div>
      )}
    </div>
  );
}

export type ProfileBannerMode = "image" | "live";

export interface ProfileBannerConfig {
  enabled: boolean;
  mode: ProfileBannerMode;
  presetId: string;
  customUrl: string | null;
  customType?: "image" | "video";
  opacity: number;
}

export const DEFAULT_BANNER_CONFIG: ProfileBannerConfig = {
  enabled: true,
  mode: "live",
  presetId: "dna-matrix",
  customUrl: null,
  opacity: 0.9,
};

export const BANNER_STORAGE_KEY = "dna_profile_banner_config_v1";

/**
 * Daftar Preset Background Profil:
 * Termasuk preset Live Video/Animasi TikTok Style & Foto Biasa Estetik
 */
export const BANNER_PRESETS = [
  // --- PRESET LIVE (TikTok Animated Style) ---
  {
    id: "dna-matrix",
    name: "Cyber DNA Matrix",
    mode: "live" as const,
    description: "Untaian partikel DNA cyber bercahaya cyan & emerald yang berdenyut dinamis.",
    gradient: "from-cyan-950 via-slate-950 to-emerald-950",
    accentColor: "#06B6D4",
    animationType: "dna-canvas",
  },
  {
    id: "neon-galaxy",
    name: "Cosmic Neon Galaxy",
    mode: "live" as const,
    description: "Aliran bintang kosmik dan nebula ungu bercahaya berputar halus.",
    gradient: "from-indigo-950 via-purple-950 to-slate-950",
    accentColor: "#A855F7",
    animationType: "galaxy-canvas",
  },
  {
    id: "aurora-wave",
    name: "Aurora Borealis Glow",
    mode: "live" as const,
    description: "Gelombang tirai cahaya aurora utara bergerak lembut memukau.",
    gradient: "from-teal-950 via-emerald-950 to-slate-950",
    accentColor: "#10B981",
    animationType: "aurora-canvas",
  },
  {
    id: "synthwave-sunset",
    name: "Retro Synthwave 80s",
    mode: "live" as const,
    description: "Grid horizon neon magenta dan matahari retro bergerak.",
    gradient: "from-fuchsia-950 via-purple-950 to-slate-950",
    accentColor: "#EC4899",
    animationType: "synthwave-canvas",
  },
  {
    id: "electric-cyber",
    name: "Electric Cyber Grid",
    mode: "live" as const,
    description: "Denyut frekuensi listrik digital kecepatan tinggi dengan efek glowing.",
    gradient: "from-blue-950 via-cyan-950 to-slate-950",
    accentColor: "#3B82F6",
    animationType: "electric-canvas",
  },

  // --- PRESET FOTO BIASA (Static Aesthetic Style) ---
  {
    id: "static-obsidian",
    name: "Deep Obsidian OLED",
    mode: "image" as const,
    description: "Gradasi hitam pekat minimalis dengan aksen garis presisi heksagonal.",
    gradient: "from-slate-900 via-zinc-950 to-black",
    accentColor: "#64748B",
    pattern: "grid",
  },
  {
    id: "static-cyberpunk",
    name: "Cyberpunk High-Tech",
    mode: "image" as const,
    description: "Aksen biru cyan teknologi tinggi bernuansa masa depan.",
    gradient: "from-cyan-900/60 via-slate-950 to-blue-950",
    accentColor: "#06B6D4",
    pattern: "dots",
  },
  {
    id: "static-crimson",
    name: "Crimson Velvet Nebula",
    mode: "image" as const,
    description: "Gradasi merah ruby dan magenta pekat yang mewah dan kontras.",
    gradient: "from-rose-950 via-pink-950/40 to-slate-950",
    accentColor: "#F43F5E",
    pattern: "mesh",
  },
  {
    id: "static-emerald",
    name: "Emerald Forest Dark",
    mode: "image" as const,
    description: "Nuansa hijau zamrud elegan dengan bayangan lembut.",
    gradient: "from-emerald-950 via-slate-950 to-teal-950/60",
    accentColor: "#10B981",
    pattern: "grid",
  },
];

/**
 * Komponen Banner Background Profil TikTok Style:
 * Ditampilkan di atas kartu Profil Pengguna.
 */
export function ProfileBannerView({
  config,
  height = 140,
}: {
  config: ProfileBannerConfig;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const preset =
    BANNER_PRESETS.find((p) => p.id === config.presetId) ||
    BANNER_PRESETS[0];

  // Render canvas animasi untuk preset live
  useEffect(() => {
    if (!config.enabled) return;
    if (config.customUrl) return; // Jika ada custom upload, pakai media kustom
    if (config.mode !== "live") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let heightPx = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      heightPx = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", onResize);

    // Particle setup berdasarkan animationType
    const animType = preset.animationType || "dna-canvas";
    const particleCount = animType === "galaxy-canvas" ? 45 : 30;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * heightPx,
      size: Math.random() * 2.5 + 1,
      speedX: (Math.random() - 0.5) * 1.2,
      speedY: (Math.random() - 0.5) * 0.8,
      hue: Math.random() * 60 + 170, // Cyan to blue to green
      alpha: Math.random() * 0.7 + 0.3,
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, heightPx);

      if (animType === "dna-canvas") {
        // Untaian DNA bergelombang melintang
        const strands = 2;
        const count = 35;
        const centerY = heightPx / 2;

        for (let i = 0; i < count; i++) {
          const x = (width / count) * i;
          const t = frame * 0.04 + i * 0.3;
          const y1 = centerY + Math.sin(t) * (heightPx * 0.32);
          const y2 = centerY + Math.sin(t + Math.PI) * (heightPx * 0.32);

          // Rung konektor DNA
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 + Math.abs(Math.cos(t)) * 0.25})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Node DNA 1
          ctx.beginPath();
          ctx.arc(x, y1, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(6, 182, 212, ${0.6 + Math.sin(t) * 0.4})`;
          ctx.shadowColor = "#06B6D4";
          ctx.shadowBlur = 8;
          ctx.fill();

          // Node DNA 2
          ctx.beginPath();
          ctx.arc(x, y2, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${0.6 - Math.sin(t) * 0.4})`;
          ctx.shadowColor = "#10B981";
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else if (animType === "galaxy-canvas") {
        // Kosmik bintang mengalir
        particles.forEach((p) => {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = heightPx;
          if (p.y > heightPx) p.y = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue + 80}, 85%, 65%, ${p.alpha})`;
          ctx.shadowColor = "#C084FC";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      } else if (animType === "synthwave-canvas") {
        // Grid retro bergerak
        const gridSpacing = 28;
        const offset = (frame * 1.2) % gridSpacing;

        ctx.strokeStyle = "rgba(236, 72, 153, 0.25)";
        ctx.lineWidth = 1;

        // Garis horizontal bergerak
        for (let y = heightPx * 0.4 + offset; y < heightPx; y += gridSpacing) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Garis perspektif vertikal
        const centerX = width / 2;
        const vanishingY = heightPx * 0.35;
        for (let x = -width; x <= width * 2; x += gridSpacing * 1.5) {
          ctx.beginPath();
          ctx.moveTo(centerX, vanishingY);
          ctx.lineTo(x, heightPx);
          ctx.stroke();
        }
      } else {
        // Aurora / Electric Wave
        particles.forEach((p, idx) => {
          p.x += p.speedX * 1.2;
          p.y += Math.sin(frame * 0.05 + idx) * 0.5;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
          ctx.shadowColor = "#10B981";
          ctx.shadowBlur = 7;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [config, preset]);

  if (!config.enabled) {
    return null;
  }

  const isCustomVideo =
    Boolean(config.customUrl) &&
    (config.customType === "video" || isVideoMediaUrl(config.customUrl));

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-2xl select-none"
      style={{
        height,
        opacity: config.opacity,
      }}
    >
      {/* 1. CUSTOM USER UPLOADED MEDIA */}
      {config.customUrl ? (
        isCustomVideo ? (
          <video
            src={config.customUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img
            src={config.customUrl}
            alt="Custom Profile Background"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        /* 2. PRESET PRELOADED THEME */
        <div
          className={`absolute inset-0 bg-gradient-to-r ${preset.gradient} transition-all duration-500`}
        >
          {/* Subtle decorative background pattern */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Canvas for Live Animated Preset */}
          {config.mode === "live" && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
            />
          )}
        </div>
      )}

      {/* Gradient Overlay for seamless integration with card content */}
      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent pointer-events-none" />

      {/* Live / Static Indicator Tag */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md text-[11px] font-semibold text-white pointer-events-none shadow-lg">
        {config.mode === "live" ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="tracking-wider uppercase text-[10px] text-red-300 font-bold">
              TikTok Live BG
            </span>
          </>
        ) : (
          <>
            <ImageIcon size={12} className="text-cyan-400" />
            <span className="text-[10px] text-slate-300">Foto Biasa</span>
          </>
        )}
      </div>
    </div>
  );
}
