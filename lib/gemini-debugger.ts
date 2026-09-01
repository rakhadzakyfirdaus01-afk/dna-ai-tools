import { GoogleGenAI } from "@google/genai";
import { getLanguageInstruction } from "@/lib/language";
import type { Locale } from "@/components/shared/language-provider";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_DEBUGGER_API_KEY!,
});

const SYSTEM_PROMPT = `
Kamu adalah AI Tech Assistant milik DNA AI Tools.

Tugasmu adalah langsung membantu pengguna menyelesaikan masalah atau menjawab pertanyaan mereka.

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
- Langsung jawab pertanyaan pengguna.
- Jangan memperkenalkan diri.
- Jangan memulai jawaban dengan "Halo", "Hai", "Saya AI Tech Assistant", atau kalimat perkenalan lainnya.
- Jangan menambahkan pembukaan yang tidak diperlukan.
- Fokus langsung pada inti pertanyaan.
- Jelaskan penyebab masalah jika relevan.
- Berikan solusi langkah demi langkah jika relevan.
- Jangan mengarang fakta.
- Gunakan format yang rapi.
`.trim();

export async function askDebugger(
  prompt: string,
  locale: Locale = "id"
) {
  const cleanPrompt = prompt.trim();

  const result = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      getLanguageInstruction(locale),
      SYSTEM_PROMPT,
      `User:\n${cleanPrompt}`,
    ].join("\n\n"),
  });

  return result.text?.trim() ?? "";
}

export async function generateDebuggerSpeech(
  text: string,
  locale: Locale = "id"
) {
  const language =
    locale === "en"
      ? "English"
      : "Indonesian";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [
      `Speak the following answer naturally in ${language}.
Do not translate it.
Do not add or remove information.
Use a clear, natural conversational voice.

Answer:
${text}`,
    ],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore",
          },
        },
      },
    },
  });

  const audioData =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioData) {
    throw new Error("AI speech audio tidak tersedia");
  }

  const pcm = Buffer.from(audioData, "base64");

  const wavHeader = createWavHeader(
    pcm.length,
    24000,
    1,
    16
  );

  const wav = Buffer.concat([
    wavHeader,
    pcm,
  ]);

  return `data:audio/wav;base64,${wav.toString("base64")}`;
}

function createWavHeader(
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
) {
  const header = Buffer.alloc(44);

  const byteRate =
    sampleRate *
    channels *
    (bitsPerSample / 8);

  const blockAlign =
    channels *
    (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(
    36 + dataLength,
    4
  );

  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(
    channels,
    22
  );

  header.writeUInt32LE(
    sampleRate,
    24
  );

  header.writeUInt32LE(
    byteRate,
    28
  );

  header.writeUInt16LE(
    blockAlign,
    32
  );

  header.writeUInt16LE(
    bitsPerSample,
    34
  );

  header.write("data", 36);

  header.writeUInt32LE(
    dataLength,
    40
  );

  return header;
}