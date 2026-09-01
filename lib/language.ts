import type { Locale } from "@/components/shared/language-provider";

const LANGUAGE_INSTRUCTIONS: Record<Locale, string> = {
  en: `
Respond in English when the user communicates in English.
If the user communicates in Indonesian, respond in Indonesian.
Match the user's language naturally.
Do not translate the user's message unless requested.
`.trim(),

  id: `
Respond in Indonesian when the user communicates in Indonesian.
If the user communicates in English, respond in English.
Match the user's language naturally.
Do not translate the user's message unless requested.
`.trim(),
};

export function getLanguageInstruction(locale: Locale) {
  return LANGUAGE_INSTRUCTIONS[locale] ?? LANGUAGE_INSTRUCTIONS.id;
}