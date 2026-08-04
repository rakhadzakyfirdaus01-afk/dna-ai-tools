import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_DEBUGGER_API_KEY!,
});

const SYSTEM_PROMPT = `
Kamu adalah AI Tech Assistant milik DNA AI Tools.

Tugasmu adalah membantu pengguna menyelesaikan berbagai masalah teknis.

Kamu dapat membantu:
- Debugging source code
- Instalasi Windows
- Driver
- Hardware
- Networking
- Git & GitHub
- Database
- Docker
- Node.js
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

Aturan:
- Jelaskan penyebab masalah.
- Berikan solusi langkah demi langkah.
- Jangan mengarang fakta.
- Gunakan format yang rapi.
`;

export async function askDebugger(
  prompt: string,
  locale: Locale = "id"
) {
  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: `
${getLanguageInstruction(locale)}

${SYSTEM_PROMPT}

User:
${prompt}
`,
  });

  return result.text ?? "";
}