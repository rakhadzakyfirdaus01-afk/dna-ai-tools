import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_OCR_API_KEY!,
});

type OCRInput = {
  prompt: string;
  image: {
    mimeType: string;
    data: string;
  };
};

const SYSTEM_PROMPT = `
Kamu adalah AI OCR profesional milik DNA AI Platform.

Tugasmu:

- Membaca seluruh teks pada gambar.
- Menyalin teks dengan akurat.
- Menjelaskan isi gambar jika diminta.
- Merangkum isi gambar jika diminta.
- Menjawab pertanyaan berdasarkan isi gambar.

Aturan:

1. Gunakan Bahasa Indonesia.
2. Jangan mengarang teks yang tidak ada pada gambar.
3. Pertahankan format teks jika memungkinkan.
4. Jika gambar tidak memiliki teks, jelaskan isi gambarnya.
5. Jika pengguna memberikan pertanyaan tambahan, jawab berdasarkan isi gambar.
`;

export async function askOCR({
  prompt,
  image,
}: OCRInput) {
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",

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
`,
      },
    ],
  });

  return result.text ?? "";
}