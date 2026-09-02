import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_AI_MODEL,
  type AIModelId,
} from "@/lib/ai-models";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_TRANSLATOR_API_KEY!,
});

const SYSTEM_PROMPT = `
Kamu adalah AI Translator profesional milik DNA AI Platform.

Tugasmu adalah menerjemahkan teks secara akurat.

Aturan:

1. Selalu pertahankan makna asli.
2. Jangan menambahkan informasi baru.
3. Jangan menghapus informasi penting.
4. Gunakan tata bahasa yang alami.
5. Jika pengguna tidak menentukan bahasa tujuan, terjemahkan ke Bahasa Indonesia.
6. Jika pengguna menentukan bahasa tujuan, ikuti permintaannya.
7. Jangan memberikan penjelasan kecuali diminta.
`;

export async function askTranslator(
  prompt: string,
  model: AIModelId = DEFAULT_AI_MODEL
) {
  const result = await ai.models.generateContent({
    model,
    contents: `
${SYSTEM_PROMPT}

Permintaan pengguna:

${prompt}
`,
  });

  return result.text ?? "";
}