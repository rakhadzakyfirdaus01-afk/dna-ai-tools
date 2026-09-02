import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_DEBUGGER_API_KEY!,
});

const TRANSCRIBE_MODEL = "gemini-3.5-transcribe";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";

const TRANSCRIBE_PROMPT = `
Transkripsikan ucapan pengguna secara akurat.

Aturan:
1. Pertahankan bahasa asli pengguna.
2. Jangan menerjemahkan.
3. Jangan menambahkan kata yang tidak diucapkan.
4. Pertahankan maksud dan konteks ucapan.
5. Hasil akhir hanya berupa teks transkripsi.
6. Deteksi bahasa ucapan secara otomatis.
`;

const TTS_PROMPT = `
Kamu adalah suara AI Assistant.

Bacakan jawaban berikut secara natural dan jelas.

Aturan:
1. Gunakan bahasa yang sama dengan jawaban.
2. Jangan menerjemahkan ke bahasa lain.
3. Jangan membaca markdown.
4. Jangan menambahkan penjelasan.
5. Langsung ucapkan isi jawaban.
6. Gunakan intonasi percakapan yang natural.

Teks yang harus dibacakan:

`;

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
  const pcm = Buffer.from(
    pcmBase64,
    "base64"
  );

  const blockAlign =
    channels * (bitsPerSample / 8);

  const byteRate =
    sampleRate * blockAlign;

  const dataSize = pcm.length;

  const wav = Buffer.alloc(
    44 + dataSize
  );

  wav.write("RIFF", 0);

  wav.writeUInt32LE(
    36 + dataSize,
    4
  );

  wav.write("WAVE", 8);

  wav.write("fmt ", 12);

  wav.writeUInt32LE(
    16,
    16
  );

  wav.writeUInt16LE(
    1,
    20
  );

  wav.writeUInt16LE(
    channels,
    22
  );

  wav.writeUInt32LE(
    sampleRate,
    24
  );

  wav.writeUInt32LE(
    byteRate,
    28
  );

  wav.writeUInt16LE(
    blockAlign,
    32
  );

  wav.writeUInt16LE(
    bitsPerSample,
    34
  );

  wav.write("data", 36);

  wav.writeUInt32LE(
    dataSize,
    40
  );

  pcm.copy(
    wav,
    44
  );

  return wav.toString(
    "base64"
  );
}

export async function transcribeVoice(
  audio: {
    mimeType: string;
    data: string;
  }
): Promise<string> {
  const audioBlob = new Blob(
    [
      Buffer.from(
        audio.data,
        "base64"
      ),
    ],
    {
      type: audio.mimeType,
    }
  );

  const audioFile =
    await ai.files.upload({
      file: audioBlob,
      config: {
        mimeType: audio.mimeType,
      },
    });

  const interaction =
    await ai.interactions.create({
      model: TRANSCRIBE_MODEL,

      input: [
        {
          type: "audio",
          uri: audioFile.uri,
          mime_type:
            audioFile.mimeType,
        },
      ],

      generation_config: {
        transcription_config: {
          language_codes: [],
        },
      },
    });

  return (
    interaction.output_text?.trim() ??
    ""
  );
}

export async function generateVoiceAudio(
  text: string
): Promise<string> {
  const cleanText =
    cleanForSpeech(text);

  if (!cleanText) {
    return "";
  }

  const interaction =
    await ai.interactions.create({
      model: TTS_MODEL,

      input:
        TTS_PROMPT +
        cleanText,

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

  const audioData =
    interaction.output_audio?.data;

  if (!audioData) {
    throw new Error(
      "Gemini TTS tidak menghasilkan audio."
    );
  }

  return pcmToWavBase64(
    audioData
  );
}