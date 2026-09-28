import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";
import { DEFAULT_AI_MODEL, type AIModelId, getActualModelId } from "@/lib/ai-models";
import { generateVoiceAudio } from "@/lib/gemini-voice";
import {
  shouldSearchWeb,
  formatGroundingSources,
  type WebSource,
} from "@/lib/web-search";

function getApiKey() {
  return (
    process.env.GEMINI_DEBUGGER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  );
}

const SYSTEM_PROMPT = `
Kamu adalah AI Assistant milik DNA AI Tools, asisten AI umum yang cerdas, ramah, dan serbaguna.

Kamu dapat membantu berbagai topik seperti:
- Berita terkini, skor olahraga, jadwal pertandingan, harga terkini, cuaca, dan peristiwa hari ini di tahun 2026 (didukung Web Search Real-Time).
- Teknologi, laptop, HP, hardware, software, jaringan, dan troubleshooting.
- Pemrograman, coding, debugging, database, Git, API, web development, dan deployment.
- Game dan gaming.
- Sekolah, pelajaran, matematika, sains, sejarah, dan penjelasan konsep.
- Perbandingan produk, pilihan pembelian, kelebihan dan kekurangan.
- Menulis, merangkum, brainstorming, ide, dan komunikasi.
- Bahasa, terjemahan, dan percakapan umum.

Perilaku & Ketentuan:
- Pahami konteks percakapan dan pertanyaan lanjutan.
- Jawab langsung sesuai pertanyaan pengguna, bukan memaksa semua topik menjadi coding.
- Jika pengguna menanyakan info terkini (berita, skor, harga, rilis game/gadget, presiden/pejabat saat ini, tahun 2026), gunakan hasil pencarian web terbaru untuk menjawab secara faktual, akurat, dan percaya diri.
- Gunakan bahasa pengguna. Jika pengguna memakai Bahasa Indonesia, jawab dalam Bahasa Indonesia; jika memakai English, jawab dalam English.
- Jawab natural seperti asisten percakapan yang cerdas, solutif, dan tidak kaku.
`.trim();

export async function askAssistantWithWebSearch(
  prompt: string,
  locale: Locale = "id",
  model: AIModelId = DEFAULT_AI_MODEL,
  forceWebSearch = false
): Promise<{
  text: string;
  sources: WebSource[];
  webSearchUsed: boolean;
}> {
  const cleanPrompt = prompt.trim();
  const actualModel = getActualModelId(model);
  const apiKey = getApiKey();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 25000,
      retryOptions: {
        attempts: 1,
      },
    },
  });

  const useWebSearch = forceWebSearch || shouldSearchWeb(cleanPrompt);

  const contents = [
    getLanguageInstruction(locale),
    SYSTEM_PROMPT,
    `User:\n${cleanPrompt}`,
  ].join("\n\n");

  if (useWebSearch) {
    try {
      const response = await ai.models.generateContent({
        model: actualModel,
        contents,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text?.trim() ?? "";
      const cand = response.candidates?.[0];
      const chunks = (cand as any)?.groundingMetadata?.groundingChunks || [];

      const sources: WebSource[] = chunks
        .map((chunk: any) => ({
          title: chunk.web?.title || "Sumber Web",
          url: chunk.web?.uri || "",
        }))
        .filter((s: WebSource) => Boolean(s.url));

      const formattedSources = formatGroundingSources(sources, locale);
      const fullText = text + (formattedSources ? formattedSources : "");

      return {
        text: fullText,
        sources,
        webSearchUsed: true,
      };
    } catch (searchError) {
      console.warn(
        "[Web Search] Grounding search failed, falling back to standard generation:",
        searchError
      );
    }
  }

  // Standard generation
  const response = await ai.models.generateContent({
    model: actualModel,
    contents,
  });

  return {
    text: response.text?.trim() ?? "",
    sources: [],
    webSearchUsed: false,
  };
}

export async function askDebugger(
  prompt: string,
  locale: Locale = "id",
  model: AIModelId = DEFAULT_AI_MODEL,
  forceWebSearch = false
): Promise<string> {
  const result = await askAssistantWithWebSearch(
    prompt,
    locale,
    model,
    forceWebSearch
  );
  return result.text;
}

/**
 * Compatibility export for the legacy /api/debugger route.
 * The main AI Assistant uses gemini-voice directly, but the old
 * debugger endpoint still imports this helper during the Vercel build.
 */
export async function generateDebuggerSpeech(
  text: string,
  _locale?: Locale
) {
  return generateVoiceAudio(text);
}