/**
 * Natural AI Voice Engine (100% Free & Unlimited)
 *
 * Menggunakan Web Speech Synthesis dengan deteksi Neural Voice alami (Microsoft Natural, Google Bahasa Indonesia, Apple Siri)
 * dan text-cleanser untuk intonasi percakapan manusia yang luwes dan natural.
 */

export function prepareTextForSpeech(text: string): string {
  if (!text) return "";

  return text
    // Ganti blok kode dengan narasi yang nyaman
    .replace(/```[\s\S]*?```/g, " Kode program tertera pada layar. ")
    // Hilangkan inline code
    .replace(/`([^`]+)`/g, "$1")
    // Hilangkan format link markdown [teks](url) -> teks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Hilangkan URL mentah
    .replace(/https?:\/\/\S+/g, "")
    // Hilangkan simbol markdown (#, *, _, ~, >, |)
    .replace(/[#*_~>|]/g, "")
    // Hilangkan tag HTML
    .replace(/<[^>]*>/g, "")
    // Rapikan tanda baca agar jeda bicara natural
    .replace(/([.!?])\s*/g, "$1 ")
    // Hilangkan spasi berulang
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Memilih suara neural paling natural yang tersedia di perangkat pengguna.
 */
export function getBestNaturalVoice(locale: "id" | "en" = "id"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  const isIndo = locale === "id";
  const targetPrefix = isIndo ? "id" : "en";

  // Filter suara sesuai bahasa yang diinginkan
  const matchingVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(targetPrefix)
  );

  const voicePool = matchingVoices.length > 0 ? matchingVoices : voices;

  // 1. Prioritas Utama: Suara berlabel "Natural" atau "Online" (misal: Microsoft Gadis Natural / Ardi Natural)
  const naturalVoice = voicePool.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes("natural") || name.includes("online");
  });
  if (naturalVoice) return naturalVoice;

  // 2. Prioritas Kedua: Suara Google (misal: Google Bahasa Indonesia / Google US English)
  const googleVoice = voicePool.find((v) => {
    const name = v.name.toLowerCase();
    return name.includes("google");
  });
  if (googleVoice) return googleVoice;

  // 3. Suara pertama yang cocok dengan bahasa target
  return voicePool[0] ?? null;
}

/**
 * Memutar suara AI secara natural dan manusiawi.
 */
export function speakNaturalVoice({
  text,
  locale = "id",
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  locale?: "id" | "en";
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  // Hentikan suara yang sedang aktif sebelumnya
  try {
    window.speechSynthesis.cancel();
  } catch {}

  const cleanText = prepareTextForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = locale === "en" ? "en-US" : "id-ID";

  // Parameter bicara natural (tidak terlalu cepat, tidak monoton)
  utterance.rate = 1.02;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const bestVoice = getBestNaturalVoice(locale);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (event) => {
    if (event.error !== "canceled" && event.error !== "interrupted") {
      onError?.(event);
    }
    onEnd?.();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    onError?.(err);
    onEnd?.();
  }

  return utterance;
}

export function stopNaturalVoice() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
