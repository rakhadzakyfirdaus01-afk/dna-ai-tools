import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_DEBUGGER_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GEMINI_CODE_API_KEY ||
  "";

const ai = new GoogleGenAI({
  apiKey,
});

const TRANSCRIBE_PROMPT = `
Transkripsikan ucapan pengguna secara akurat dan bersih.
Aturan:
1. Pertahankan bahasa asli pengguna (Bahasa Indonesia atau Inggris).
2. Jangan menerjemahkan kata-kata.
3. Jangan menambahkan penjelasan atau teks pembuka/penutup.
4. Kembalikan HANYA teks yang diucapkan pengguna.
`.trim();

function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*#`_~]/g, "")
    .replace(/\[(.*?)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function pcmToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;

  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  pcm.copy(wav, 44);

  return wav.toString("base64");
}

/**
 * Transkripsi suara pengguna menggunakan Gemini multimodal audio.
 */
export async function transcribeVoice(
  audio: {
    mimeType: string;
    data: string;
  }
): Promise<string> {
  const cleanMime = audio.mimeType.split(";")[0] || "audio/webm";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: cleanMime,
            data: audio.data,
          },
        },
        {
          text: TRANSCRIBE_PROMPT,
        },
      ],
    });

    return result.text?.trim() ?? "";
  } catch (error) {
    console.error("[Voice] Transcription error:", error);
    throw new Error("Gagal mentranskripsikan suara dengan AI.");
  }
}

/**
 * Generator audio suara (jika tersedia di environment/SDK).
 * Mengembalikan null jika server-side TTS tidak aktif, agar otomatis dialihkan ke Client Natural TTS.
 */
export async function generateVoiceAudio(
  text: string
): Promise<string | null> {
  const cleanText = cleanForSpeech(text);
  if (!cleanText) {
    return null;
  }

  try {
    const interaction = await (ai as any).interactions?.create?.({
      model: "gemini-3.1-flash-tts-preview",
      input: cleanText,
      response_format: {
        type: "audio",
      },
      generation_config: {
        speech_config: [
          {
            voice: "Kore",
          },
        ],
      },
    });

    const audioData = interaction?.output_audio?.data;
    if (audioData) {
      return pcmToWavBase64(audioData);
    }
  } catch {
    // Graceful fallback to client natural voice
  }

  return null;
}