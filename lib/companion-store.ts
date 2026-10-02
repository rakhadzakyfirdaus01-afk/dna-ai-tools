export type CompanionSkin =
  | "dna-droid"
  | "cyber-neko"
  | "gamer-bot"
  | "pixel-pet"
  | "scholar"
  | "ninja-shadow";

export type CompanionColor =
  | "cyan"
  | "purple"
  | "emerald"
  | "amber"
  | "rose"
  | "blue";

export type CompanionAccessory =
  | "none"
  | "glasses"
  | "crown"
  | "halo"
  | "sparks";

export type CompanionSize = "compact" | "normal" | "large";

export interface CompanionConfig {
  enabled: boolean;
  skin: CompanionSkin;
  color: CompanionColor;
  accessory: CompanionAccessory;
  size: CompanionSize;
  name: string;
}

export const DEFAULT_COMPANION_CONFIG: CompanionConfig = {
  enabled: true,
  skin: "dna-droid",
  color: "cyan",
  accessory: "none",
  size: "normal",
  name: "DNA Buddy",
};

export const COLOR_MAP: Record<
  CompanionColor,
  { label: string; bg: string; border: string; glow: string; text: string; hex: string }
> = {
  cyan: {
    label: "Cyber Cyan",
    bg: "bg-cyan-500",
    border: "border-cyan-400",
    glow: "rgba(6, 182, 212, 0.4)",
    text: "text-cyan-400",
    hex: "#06B6D4",
  },
  purple: {
    label: "Neon Violet",
    bg: "bg-purple-500",
    border: "border-purple-400",
    glow: "rgba(168, 85, 247, 0.4)",
    text: "text-purple-400",
    hex: "#A855F7",
  },
  emerald: {
    label: "Matrix Green",
    bg: "bg-emerald-500",
    border: "border-emerald-400",
    glow: "rgba(16, 185, 129, 0.4)",
    text: "text-emerald-400",
    hex: "#10B981",
  },
  amber: {
    label: "Solar Gold",
    bg: "bg-amber-500",
    border: "border-amber-400",
    glow: "rgba(245, 158, 11, 0.4)",
    text: "text-amber-400",
    hex: "#F59E0B",
  },
  rose: {
    label: "Cyber Pink",
    bg: "bg-rose-500",
    border: "border-rose-400",
    glow: "rgba(244, 63, 94, 0.4)",
    text: "text-rose-400",
    hex: "#F43F5E",
  },
  blue: {
    label: "Electric Blue",
    bg: "bg-blue-500",
    border: "border-blue-400",
    glow: "rgba(59, 130, 246, 0.4)",
    text: "text-blue-400",
    hex: "#3B82F6",
  },
};

export const SKINS_DATA: {
  id: CompanionSkin;
  name: string;
  tag: string;
  desc: string;
}[] = [
  {
    id: "dna-droid",
    name: "DNA Cyber Bot",
    tag: "Original",
    desc: "Maskot resmi DNA AI berbentuk kapsul cyber hologram terapung.",
  },
  {
    id: "cyber-neko",
    name: "Cyber Neko",
    tag: "Cute",
    desc: "Dilengkapi telinga kucing hologram neon dan kumis cyber.",
  },
  {
    id: "gamer-bot",
    name: "RGB Gamer Bot",
    tag: "Tech",
    desc: "Memakai headset gaming neon RGB dan visor mata futuristik.",
  },
  {
    id: "pixel-pet",
    name: "8-Bit Retro Pet",
    tag: "Arcade",
    desc: "Gaya retro game 8-bit klasik dengan aura scanline.",
  },
  {
    id: "scholar",
    name: "Sarjana Genius",
    tag: "Pintar",
    desc: "Memakai topi toga wisuda dan kacamata akademisi jenius.",
  },
  {
    id: "ninja-shadow",
    name: "Cyber Ninja",
    tag: "Cool",
    desc: "Memakai ikat kepala ninja neon berani dan aksen bayangan.",
  },
];

export const ACCESSORIES_DATA: {
  id: CompanionAccessory;
  name: string;
  icon: string;
}[] = [
  { id: "none", name: "Tanpa Aksesoris", icon: "🚫" },
  { id: "glasses", name: "Kacamata Hitam Cyber", icon: "🕶️" },
  { id: "crown", name: "Mahkota Emas", icon: "👑" },
  { id: "halo", name: "Angel Halo", icon: "😇" },
  { id: "sparks", name: "Petir & Bintang", icon: "⚡" },
];

export const COMPANION_STORAGE_KEY = "dna_companion_config_v1";
export const COMPANION_EVENT_KEY = "dna_companion_changed";
export const COMPANION_OPEN_CUSTOMIZER_EVENT = "dna_companion_open_customizer";

export function getCompanionConfig(): CompanionConfig {
  if (typeof window === "undefined") {
    return DEFAULT_COMPANION_CONFIG;
  }
  try {
    const raw = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (!raw) return DEFAULT_COMPANION_CONFIG;
    return { ...DEFAULT_COMPANION_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COMPANION_CONFIG;
  }
}

export function saveCompanionConfig(config: CompanionConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent(COMPANION_EVENT_KEY, { detail: config })
    );
  } catch (e) {
    console.error("Failed to save companion config", e);
  }
}

export function openCompanionCustomizer() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPANION_OPEN_CUSTOMIZER_EVENT));
}
