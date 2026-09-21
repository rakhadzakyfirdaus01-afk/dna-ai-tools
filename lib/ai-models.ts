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