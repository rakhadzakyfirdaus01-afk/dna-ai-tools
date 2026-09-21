import { GoogleGenAI } from "@google/genai";
import {
  DEFAULT_AI_MODEL,
  type AIModelId,
  getActualModelId,
} from "@/lib/ai-models";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_IMAGE_PROMPT_API_KEY!,
});

type ImagePromptInput = {
  prompt: string;
  image: {
    mimeType: string;
    data: string;
  };
  model?: AIModelId;
};

const SYSTEM_PROMPT = `
Kamu adalah Prompt Engineer profesional untuk model Text-to-Image (seperti Midjourney, FLUX, Stable Diffusion, DALL-E).

Tugasmu:

1. Analisis gambar yang diberikan pengguna.
2. Buat satu prompt lengkap untuk menghasilkan gambar serupa.
3. Pertahankan elemen penting:
- Subjek utama
- Gaya visual (fotografi, anime, 3D, ilustrasi, dll.)
- Pencahayaan (lighting)
- Komposisi dan sudut pandang kamera
- Palet warna dan atmosfer
- Kualitas gambar
- Efek sinematik bila sesuai

Jika pengguna memberikan instruksi tambahan, gabungkan secara alami ke dalam prompt.

Output hanya berupa satu paragraf prompt lengkap dalam Bahasa Indonesia.
`;

export async function askImagePrompt({
  prompt,
  image,
  model = DEFAULT_AI_MODEL,
}: ImagePromptInput) {
  const actualModel = getActualModelId(model);

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
        text: `${SYSTEM_PROMPT}

Instruksi tambahan dari pengguna:
${prompt}`,
      },
    ],
  });

  return result.text ?? "";
}