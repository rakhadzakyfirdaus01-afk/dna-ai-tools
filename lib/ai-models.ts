export const AI_MODELS = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
  },
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
] as const;

export type AIModelId = (typeof AI_MODELS)[number]["id"];

export const DEFAULT_AI_MODEL: AIModelId = "gemini-3.6-flash";