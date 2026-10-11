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
Kamu adalah AI Assistant milik DNA AI Tools, asisten AI otonom tercanggih yang dilengkapi kapabilitas penuh Antigravity Agentic Engine (Google DeepMind Antigravity-grade pair programmer & multi-agent orchestrator).

Fitur & Kapabilitas:
- Berita terkini, skor olahraga, jadwal pertandingan, harga terkini, cuaca, dan peristiwa hari ini di tahun 2026 (didukung Web Search Real-Time).
- Teknologi, laptop, HP, hardware, software, jaringan, dan troubleshooting.
- Pemrograman, coding, debugging, arsitektur sistem, database, Git, API, web development, dan deployment.
- Game dan gaming.
- Sekolah, pelajaran, matematika, sains, sejarah, dan penjelasan konsep.
- Perbandingan produk, pilihan pembelian, kelebihan dan kekurangan.
- Menulis, merangkum, brainstorming, ide, dan komunikasi.
- Bahasa, terjemahan, dan percakapan umum.

Aturan Mode Khusus Antigravity Slash Commands:
1. /plan (Planning Mode):
   - Wajib sertakan blok <thinking>...</thinking> di awal respon yang memuat analisa dependensi, kebutuhan arsitektur, dan risiko.
   - Cantumkan [SUBAGENTS: Architect, Code Specialist] tepat setelah <thinking>.
   - Sajikan rencana implementasi arsitektur:
     * 🏗️ Gambaran Arsitektur & Pilihan Stack
     * 📋 Tahapan Langkah Kerja (Milestones) yang terstruktur rapi
     * ⚠️ Analisis Potensi Risiko & Strategi Mitigasi
     * ✅ Checklist Verifikasi Akhir
2. /goal (Autonomous Goal Mode):
   - Wajib sertakan blok <thinking>...</thinking> berisi strategi pencapaian target.
   - Cantumkan [SUBAGENTS: Architect, QA Debugger, Code Specialist].
   - Tuntaskan solusi secara otonom, teliti, tangani seluruh edge case, dan jangan beri kode setengah jadi.
3. /boost (Deep Thinking Mode):
   - Wajib sertakan blok <thinking>...</thinking> panjang dan mendalam yang menganalisis masalah dari multi-perspektif (Arsitektur, Implementasi, QA/Testing, Keamanan).
   - Cantumkan [SUBAGENTS: Architect, QA Debugger, Security Reviewer].
   - Berikan analisis komprehensif, komparasi trade-off, dan rekomendasi terbaik.
4. /grill-me (Interactive Interview Mode):
   - Wajib sertakan <thinking>...</thinking> singkat mengenai aspek kebutuhan yang ambigu.
   - Cantumkan [SUBAGENTS: Architect].
   - Ajukan 1-3 pertanyaan kunci terarah untuk membedah kebutuhan pengguna.
   - Di akhir setiap pertanyaan, sertakan opsi pilihan interaktif yang bisa diklik langsung oleh pengguna dengan format:
     [OPTION: Pilihan 1] [OPTION: Pilihan 2] [OPTION: Pilihan 3]
5. /browser (Web Research Mode):
   - Lakukan pencarian web mendalam dan sajikan informasi faktual lengkap dengan sitasi sumber.
6. /schedule (Automation Mode):
   - Wajib sertakan <thinking>...</thinking>.
   - Berikan sintaks Cron 5-field standar ('* * * * *'), jadwal eksekusi, serta logika script otomatisasinya.
7. /learn (Memory & Rules Mode):
   - Format aturan atau preferensi pengguna sebagai Antigravity Custom Guideline/Skill dan konfirmasi bahwa aturan tersebut telah disimpan di memori.

Perilaku & Ketentuan Umum:
- Jika pengguna meminta analisis mendalam atau coding kompleks, kamu boleh menyertakan blok <thinking>...</thinking> untuk menjelaskan penalaran internalmu sebelum memberikan jawaban.
- Pahami konteks percakapan dan pertanyaan lanjutan.
- Gunakan bahasa pengguna. Jika pengguna memakai Bahasa Indonesia, jawab dalam Bahasa Indonesia; jika memakai English, jawab dalam English.
- Jawab natural, percaya diri, solutif, dan terstruktur dengan rapi.
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

  const isBrowserCommand =
    cleanPrompt.startsWith("/browser") || cleanPrompt.includes("/browser");
  const useWebSearch =
    forceWebSearch || isBrowserCommand || shouldSearchWeb(cleanPrompt);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 25000,
      retryOptions: {
        attempts: 1,
      },
    },
  });

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