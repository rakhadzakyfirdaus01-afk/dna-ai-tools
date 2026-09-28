/**
 * Web Search Real-Time helper for DNA AI Platform.
 * Detects real-time queries and formats Google Search Grounding metadata.
 */

export type WebSource = {
  title: string;
  url: string;
};

const WEB_SEARCH_KEYWORDS = [
  // Waktu / Hari ini
  "hari ini",
  "sekarang",
  "saat ini",
  "terbaru",
  "terkini",
  "teranyar",
  "tahun ini",
  "tahun 2026",
  "2026",
  "2025",
  "kemarin",
  "tadi malam",
  "minggu ini",
  "bulan ini",
  "jam berapa",
  "tanggal berapa",

  // Berita & Peristiwa
  "berita",
  "kabar",
  "info terbaru",
  "informasi terkini",
  "update",
  "viral",
  "trending",
  "gempa",
  "banjir",
  "breaking news",

  // Olahraga & Skor
  "skor",
  "hasil pertandingan",
  "klasemen",
  "jadwal bola",
  "liga champions",
  "premier league",
  "liga inggris",
  "motogp",
  "f1",
  "juara",
  "menang tadi",

  // Harga & Finansial
  "harga",
  "kurs",
  "dollar",
  "rupiah",
  "emas",
  "bitcoin",
  "crypto",
  "saham",

  // Cuaca
  "cuaca",
  "prakiraan cuaca",
  "hujan",

  // Rilis & Teknologi
  "kapan rilis",
  "tanggal rilis",
  "hp baru",
  "spesifikasi",
  "game rilis",
  "film bioskop",
  "jadwal tayang",

  // Tokoh & Jabatan terkini
  "presiden",
  "menteri",
  "gubernur",
  "walikota",
  "ceo",

  // Perintah langsung
  "cari di internet",
  "cari di google",
  "browsing",
  "search web",
  "googling",
  "web search",
  "akses web",
];

export function shouldSearchWeb(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return WEB_SEARCH_KEYWORDS.some((kw) => lower.includes(kw));
}

export function formatGroundingSources(
  sources: WebSource[],
  locale: "id" | "en" = "id"
): string {
  if (!sources || sources.length === 0) return "";

  // Unique by title / domain
  const seen = new Set<string>();
  const uniqueSources: WebSource[] = [];

  for (const s of sources) {
    if (!s.url || seen.has(s.title)) continue;
    seen.add(s.title);
    uniqueSources.push(s);
    if (uniqueSources.length >= 4) break;
  }

  if (uniqueSources.length === 0) return "";

  const heading =
    locale === "en" ? "🌐 Sources & References:" : "🌐 Sumber Web Terkini:";

  const items = uniqueSources
    .map((s) => `- [${s.title}](${s.url})`)
    .join("\n");

  return `\n\n---\n**${heading}**\n${items}`;
}
