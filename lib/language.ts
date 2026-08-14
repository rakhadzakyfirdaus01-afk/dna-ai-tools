import type { Locale } from "@/components/shared/language-provider";

const LANGUAGE_INSTRUCTIONS: Record<Locale, string> = {
  en: `
Always answer in English.
If generating prompts, generate them in English.
Do not answer in Indonesian unless the user explicitly requests it.
`.trim(),

  id: `
Selalu jawab menggunakan Bahasa Indonesia.
Jika membuat prompt AI, gunakan Bahasa Indonesia.
Jangan menggunakan Bahasa Inggris kecuali diminta oleh pengguna.
`.trim(),
};

export function getLanguageInstruction(locale: Locale) {
  return LANGUAGE_INSTRUCTIONS[locale] ?? LANGUAGE_INSTRUCTIONS.id;
}