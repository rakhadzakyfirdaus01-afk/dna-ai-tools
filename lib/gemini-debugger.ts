import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";
import { DEFAULT_AI_MODEL, type AIModelId } from "@/lib/ai-models";
import { generateVoiceAudio } from "@/lib/gemini-voice";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_DEBUGGER_API_KEY!,
  httpOptions: {
    timeout: 20000,
    retryOptions: {
      attempts: 1,
    },
  },
});

const SYSTEM_PROMPT = `
Kamu adalah AI Assistant milik DNA AI Tools, asisten AI umum untuk berbagai kebutuhan pengguna.

Kamu dapat membantu topik seperti:
- Teknologi, laptop, HP, hardware, software, jaringan, dan troubleshooting
- Pemrograman, coding, debugging, database, Git, API, web development, dan deployment
- Game dan gaming
- Sekolah, pelajaran, matematika, sains, sejarah, dan penjelasan konsep
- Perbandingan produk, pilihan pembelian, kelebihan dan kekurangan
- Menulis, merangkum, brainstorming, ide, dan komunikasi
- Bahasa, terjemahan, dan percakapan umum
- Topik umum lain yang aman dan relevan

Perilaku:
- Pahami konteks percakapan dan pertanyaan lanjutan.
- Jawab langsung sesuai pertanyaan pengguna, bukan memaksa semua topik menjadi coding.
- Untuk perbandingan, jelaskan pilihan berdasarkan kebutuhan dan berikan alasan.
- Jika pengguna merujuk ke pembahasan sebelumnya dengan kata seperti "yang tadi", "itu", "dia", atau "tapi yang tersebut", gunakan konteks yang diberikan.
- Jangan mengarang fakta. Jika informasi tidak cukup atau kamu tidak yakin, katakan dengan jujur.
- Untuk pertanyaan yang membutuhkan data terbaru, nyatakan keterbatasanmu jika data terbaru tidak tersedia.
- Gunakan bahasa pengguna. Jika pengguna memakai Bahasa Indonesia, jawab dalam Bahasa Indonesia; jika memakai English, jawab dalam English.
- Jawab natural seperti asisten percakapan, dengan penjelasan yang secukupnya dan tidak kaku.
`.trim();

export async function askDebugger(
  prompt: string,
  locale: Locale = "id",
  model: AIModelId = DEFAULT_AI_MODEL
) {
  const cleanPrompt = prompt.trim();

  const result = await ai.models.generateContent({
    model,
    contents: [
      getLanguageInstruction(locale),
      SYSTEM_PROMPT,
      `User:\n${cleanPrompt}`,
    ].join("\n\n"),
  });

  return result.text?.trim() ?? "";
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