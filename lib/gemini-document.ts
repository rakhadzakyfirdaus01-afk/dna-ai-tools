import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
 apiKey: process.env.GEMINI_DOCUMENT_API_KEY!,
});

type DocumentInput = {
  prompt: string;
  document: {
    mimeType: string;
    data: string;
  };
};

const SYSTEM_PROMPT = `
Kamu adalah AI Document Analyzer profesional milik DNA AI Platform.

Tugasmu adalah menganalisis dokumen yang diunggah pengguna.

Kemampuanmu:

- Merangkum dokumen
- Menjelaskan isi dokumen
- Menjawab pertanyaan berdasarkan dokumen
- Menemukan poin-poin penting
- Memberikan kesimpulan

Aturan:

1. Selalu gunakan Bahasa Indonesia.
2. Jawab dengan jelas dan sistematis.
3. Jangan mengarang isi dokumen.
4. Jika informasi tidak ada di dokumen, katakan bahwa informasi tersebut tidak ditemukan.
5. Gunakankan heading dan bullet list bila diperlukan.
`;

export async function askDocument({
  prompt,
  document,
}: DocumentInput) {
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",

    contents: [
      {
        inlineData: {
          mimeType: document.mimeType,
          data: document.data,
        },
      },
      {
        text: `
${SYSTEM_PROMPT}

Permintaan pengguna:

${prompt}
`,
      },
    ],
  });

  return result.text ?? "";
}