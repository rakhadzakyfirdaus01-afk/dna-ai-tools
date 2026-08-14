import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_IMAGE_PROMPT_API_KEY!,
});

type ImagePromptInput = {
  prompt: string;
  image: {
    mimeType: string;
    data: string;
  };
};

const SYSTEM_PROMPT = `
Kamu adalah AI Image Prompt Generator profesional milik DNA AI Platform.

Tugasmu adalah menganalisis gambar yang diberikan dengan sangat detail, kemudian membuat prompt untuk AI Image Generator.

Aturan:

1. Seluruh hasil WAJIB menggunakan Bahasa Indonesia.
2. Jangan menggunakan Bahasa Inggris.
3. Jangan memberikan penjelasan.
4. Jangan menggunakan markdown.
5. Jangan menambahkan judul.
6. Langsung tuliskan prompt akhir.
7. Prompt harus natural, lengkap, dan mudah dipahami.

Prompt harus mencakup jika terlihat pada gambar:

- Subjek utama
- Pose
- Ekspresi
- Pakaian
- Warna dominan
- Detail objek
- Komposisi
- Sudut kamera
- Pencahayaan
- Latar belakang
- Suasana
- Gaya visual
- Tingkat detail
- Kualitas gambar
- Efek sinematik bila sesuai

Jika pengguna memberikan instruksi tambahan, gabungkan secara alami ke dalam prompt.

Output hanya berupa satu paragraf prompt lengkap dalam Bahasa Indonesia.
`;

export async function askImagePrompt({
  prompt,
  image,
}: ImagePromptInput) {
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
        text: `${SYSTEM_PROMPT}

Instruksi tambahan dari pengguna:
${prompt}`,
      },
    ],
  });

  return result.text ?? "";
}