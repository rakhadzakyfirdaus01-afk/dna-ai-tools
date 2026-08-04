import type { Locale } from "@/components/shared/language-provider";

export function getLanguageInstruction(locale: Locale) {
  switch (locale) {
    case "en":
      return `
Always answer in English.
If generating prompts, generate them in English.
Do not answer in Indonesian unless the user explicitly requests it.
`;

    case "id":
    default:
      return `
Selalu jawab menggunakan Bahasa Indonesia.
Jika membuat prompt AI, gunakan Bahasa Indonesia.
Jangan menggunakan Bahasa Inggris kecuali diminta oleh pengguna.
`;
  }
}