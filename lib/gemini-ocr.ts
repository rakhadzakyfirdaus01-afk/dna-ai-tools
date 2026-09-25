import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_AI_MODEL,
  type AIModelId,
  getActualModelId,
} from "@/lib/ai-models";

type OCRInput = {
  prompt: string;
  image: {
    mimeType: string;
    data: string;
  };
  model?: AIModelId;
};

function getApiKey() {
  return (
    process.env.GEMINI_OCR_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_DEBUGGER_API_KEY ||
    process.env.GEMINI_IMAGE_PROMPT_API_KEY ||
    ""
  );
}

const SYSTEM_PROMPT = `
Kamu adalah AI Visual & Analisis Gambar cerdas milik DNA AI Platform.

Tugas dan Kemampuan Utama:
1. Analisis Visual & Pengenalan Game/Karakter/Objek:
   - Kenali karakter, game, film, screenshot, tokoh, tempat, atau objek dari gambar dengan akurat.
   - Jika pengguna bertanya seperti "coba tebak ini game apa", "siapa karakter ini", "apa ini", sebutkan nama game, karakter, dan konteksnya secara spesifik dan jelas.
2. Membaca Teks (OCR) & Mengerjakan Tugas:
   - Jika gambar berisi teks dokumen, soal latihan, atau kode, baca dengan teliti dan berikan penjelasan atau jawaban lengkapnya.
3. Gaya Jawaban:
   - Gunakan Bahasa Indonesia yang natural, informatif, dan langsung ke inti jawaban.
`.trim();

export async function askOCR({
  prompt,
  image,
  model = DEFAULT_AI_MODEL,
}: OCRInput) {
  const actualModel = getActualModelId(model);
  const apiKey = getApiKey();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30000,
    },
  });

  const result = await ai.models.generateContent({
    model: actualModel,
    contents: [
      {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      },
      {
        text: `
${SYSTEM_PROMPT}

Instruksi pengguna:
${prompt}
`.trim(),
      },
    ],
  });

  return result.text?.trim() ?? "";
}