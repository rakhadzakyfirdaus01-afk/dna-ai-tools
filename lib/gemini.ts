import { GoogleGenAI } from "@google/genai";
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

export async function askGemini(
  prompt: string,
  locale: Locale = "id"
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${getLanguageInstruction(locale)}

${SYSTEM_PROMPT}

User:
${prompt}
`,
  });

  return response.text ?? "";
}