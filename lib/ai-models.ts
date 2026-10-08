export const AUTO_MODEL = "auto" as const;

export const AI_MODELS = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
  },
] as const;

export type ActualAIModelId = (typeof AI_MODELS)[number]["id"];

export type AIModelId =
  | typeof AUTO_MODEL
  | ActualAIModelId;

export const DEFAULT_FALLBACK_MODEL: ActualAIModelId = "gemini-2.5-flash";

export const DEFAULT_AI_MODEL: AIModelId = AUTO_MODEL;

/**
 * Konversi aman dari AIModelId (termasuk "auto") ke model fisik Gemini yang valid.
 */
export function getActualModelId(
  model?: AIModelId | string | null
): ActualAIModelId {
  if (!model || model === AUTO_MODEL || model === "auto") {
    return DEFAULT_FALLBACK_MODEL;
  }

  const found = AI_MODELS.find((item) => item.id === model);
  return found ? found.id : DEFAULT_FALLBACK_MODEL;
}

/**
 * Mendapatkan urutan model kandidat untuk dicoba.
 * - Jika model = "auto": mencoba model dari yang paling stabil (gemini-2.5-flash, gemini-3.5-flash, dst).
 * - Jika user memilih model spesifik (misal gemini-3.5-flash): model tersebut dicoba PERTAMA KALI.
 *   Jika kuota habis atau error, otomatis fallback ke model lainnya.
 */
export function resolveModelCandidates(
  selectedModel?: AIModelId | string | null
): ActualAIModelId[] {
  const allActualModels: ActualAIModelId[] = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
  ];

  if (
    !selectedModel ||
    selectedModel === AUTO_MODEL ||
    selectedModel === "auto"
  ) {
    return allActualModels;
  }

  const chosen = allActualModels.find((m) => m === selectedModel);
  if (!chosen) {
    return allActualModels;
  }

  return [chosen, ...allActualModels.filter((m) => m !== chosen)];
}

/**
 * Deteksi apakah error dari Gemini API memenuhi syarat fallback ke model lain:
 * Termasuk 429 Quota Exceeded, Rate Limit, Service Unavailable (503), Gateway Timeout (504),
 * DEADLINE_EXCEEDED, Connection Timeout, Model Not Found (404), Overloaded, dll.
 */
export function isModelFallbackError(error: unknown): boolean {
  if (!error) return false;

  const rawMessage = error instanceof Error ? error.message : String(error);
  const normalized = rawMessage.toLowerCase();

  // Coba parse jika error berupa JSON string dari Google API
  let parsedCode: number | undefined;
  let parsedStatus: string | undefined;

  try {
    const jsonMatch = rawMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const errObj = parsed?.error || parsed;
      if (typeof errObj?.code === "number") parsedCode = errObj.code;
      if (typeof errObj?.status === "string") parsedStatus = errObj.status.toLowerCase();
    }
  } catch {
    // Abaikan jika bukan format JSON
  }

  // 1. Quota / Rate Limit (429, RESOURCE_EXHAUSTED)
  if (
    parsedCode === 429 ||
    parsedStatus === "resource_exhausted" ||
    normalized.includes("429") ||
    normalized.includes("resource_exhausted") ||
    normalized.includes("too many requests") ||
    normalized.includes("quota") ||
    normalized.includes("rate limit") ||
    normalized.includes("exceeded your current quota")
  ) {
    return true;
  }

  // 2. Timeout & Deadline Exceeded (504, DEADLINE_EXCEEDED, ETIMEDOUT, timeout)
  if (
    parsedCode === 504 ||
    parsedStatus === "deadline_exceeded" ||
    normalized.includes("504") ||
    normalized.includes("deadline_exceeded") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("deadline expired") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("connect timeout") ||
    normalized.includes("und_err_connect_timeout") ||
    normalized.includes("etimedout") ||
    normalized.includes("gateway timeout") ||
    normalized.includes("request timed out")
  ) {
    return true;
  }

  // 3. Service Unavailable & High Demand (503, UNAVAILABLE)
  if (
    parsedCode === 503 ||
    parsedStatus === "unavailable" ||
    normalized.includes("503") ||
    normalized.includes("service unavailable") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("currently experiencing high demand") ||
    normalized.includes("overloaded")
  ) {
    return true;
  }

  // 4. Model Not Found / Unsupported / Deprecated (404, NOT_FOUND)
  if (
    parsedCode === 404 ||
    parsedStatus === "not_found" ||
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("no longer available") ||
    normalized.includes("not supported")
  ) {
    return true;
  }

  // 5. Network & Abort Failures
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("network error") ||
    normalized.includes("econnreset") ||
    normalized.includes("socket hang up") ||
    normalized.includes("operation was aborted") ||
    normalized.includes("aborterror") ||
    normalized.includes("aborted")
  ) {
    return true;
  }

  // 6. Internal Transient Google Server Error (500, INTERNAL)
  if (
    parsedCode === 500 ||
    parsedStatus === "internal" ||
    normalized.includes("500 internal server error") ||
    normalized.includes("internal error encountered")
  ) {
    return true;
  }

  return false;
}