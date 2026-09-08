import { GoogleGenAI } from "@google/genai";
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
} from "@/lib/ai-models";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const SYSTEM_PROMPT = `
Kamu adalah AI Tech Assistant milik DNA AI Tools.

Peranmu adalah membantu pengguna menyelesaikan berbagai masalah teknis, bukan hanya error kode.

Kemampuanmu meliputi:

- Debugging source code
- Menjelaskan error dan penyebabnya
- Memberikan solusi langkah demi langkah
- Review dan optimasi kode
- Instalasi software
- Troubleshooting Windows
- Troubleshooting Linux
- Troubleshooting macOS
- Hardware komputer
- Driver
- Networking
- Git & GitHub
- Database (MySQL, PostgreSQL, Prisma, Supabase)
- Docker
- Node.js
- NPM
- Laravel
- React
- Next.js
- Python
- Java
- C#
- C++
- HTML
- CSS
- JavaScript
- TypeScript
- API
- Cloud
- Deployment
- AI API (Gemini, OpenAI, dll.)

Aturan menjawab:

1. Jelaskan penyebab masalah dengan bahasa sederhana.
2. Berikan solusi langkah demi langkah.
3. Jika ada beberapa solusi, urutkan dari yang paling mudah.
4. Jika informasi pengguna kurang, tanyakan informasi yang diperlukan sebelum menebak.
5. Untuk debugging kode, jelaskan letak kesalahan dan tampilkan contoh perbaikannya.
6. Jangan mengarang fakta. Jika tidak yakin, katakan bahwa informasi tambahan diperlukan.
7. Selalu gunakan format yang rapi dan mudah dibaca.
`;

// ==========================================
// DETEKSI ERROR YANG BOLEH FALLBACK
// ==========================================

function isModelFallbackError(
  error: unknown
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  const normalized =
    message.toLowerCase();

  return (
    normalized.includes("429") ||
    normalized.includes(
      "too many requests"
    ) ||
    normalized.includes(
      "resource_exhausted"
    ) ||
    normalized.includes("quota") ||
    normalized.includes(
      "rate limit"
    ) ||
    normalized.includes(
      "exceeded your current quota"
    ) ||
    normalized.includes("503") ||
    normalized.includes(
      "service unavailable"
    ) ||
    normalized.includes(
      "temporarily unavailable"
    ) ||
    normalized.includes("404") ||
    normalized.includes(
      "not found"
    ) ||
    normalized.includes(
      "no longer available"
    )
  );
}

// ==========================================
// AI GEMINI DENGAN AUTO FALLBACK
// ==========================================

export async function askGemini(
  prompt: string,
  locale: Locale = "id"
) {
  const modelCandidates = [
    DEFAULT_AI_MODEL,
    ...AI_MODELS
      .map((model) => model.id)
      .filter(
        (model) =>
          model !== DEFAULT_AI_MODEL
      ),
  ];

  let lastError: unknown = null;

  for (
    const model of modelCandidates
  ) {
    try {
      console.log(
        `[AI Assistant] Trying model: ${model}`
      );

      const response =
        await ai.models.generateContent({
          model,

          contents: `
${getLanguageInstruction(locale)}

${SYSTEM_PROMPT}

User:
${prompt}
`,
        });

      const result =
        response.text ?? "";

      if (result.trim()) {
        console.log(
          `[AI Assistant] Model succeeded: ${model}`
        );

        return result;
      }

      lastError = new Error(
        `Model ${model} returned an empty response.`
      );

    } catch (error) {
      lastError = error;

      console.warn(
        `[AI Assistant] Model failed: ${model}`,
        error
      );

      // Kalau error-nya termasuk quota,
      // rate limit, unavailable, atau model
      // sudah tidak tersedia → lanjut model berikutnya.
      if (
        isModelFallbackError(error)
      ) {
        continue;
      }

      // Error lain tidak boleh ditutupi.
      throw error;
    }
  }

  throw (
    lastError ??
    new Error(
      "Semua model Gemini tidak dapat memberikan jawaban."
    )
  );
}