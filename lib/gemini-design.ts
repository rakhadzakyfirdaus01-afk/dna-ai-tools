import { GoogleGenAI } from "@google/genai";

// Ensure Node.js on Windows does not fail on SSL certificate verification
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const apiKey =
  process.env.GEMINI_IMAGE_PROMPT_API_KEY ||
  process.env.GEMINI_AI_DESIGN_API_KEY ||
  process.env.GEMINI_DEBUGGER_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
    })
  : null;

/**
 * Instruksi untuk Gemini.
 *
 * Gemini bertugas mengubah brief desain bahasa Indonesia pengguna
 * menjadi prompt deskripsi visual bahasa Inggris berkualitas tinggi
 * untuk model FLUX / image generator.
 */
const DESIGN_PROMPT_SYSTEM_INSTRUCTION = `
You are a world-class commercial graphic design art director and prompt engineer.

Your task is to transform a user's design brief (which may be in Indonesian) into a SINGLE HIGH-QUALITY ENGLISH VISUAL PROMPT for an image generation model (FLUX).

RULES:
1. Output MUST be ONLY in English.
2. Output MUST be a single cohesive descriptive paragraph (no lists, no bullet points, no options, no conversational preamble).
3. Capture the exact theme of the request (e.g. corporate recruitment poster, modern office background, gaming store advertisement, food poster).
4. If the user asks for a poster / vacancy / advertisement, describe an elegant graphic design background with clean composition, professional lighting, modern layout, and clean negative space for typography.
5. If the request is for a job vacancy / recruitment poster, emphasize "modern corporate recruitment poster design, professional business setting, sleek clean background, elegant accents, large empty central negative space for text layout, studio lighting, no people portrait closeups unless asked".
6. Do NOT include any markdown bolding (**), asterisks (*), or quotes (").
7. Directly output the final English prompt.
`;

function cleanVisualPrompt(value: string): string {
  let result = value.trim();

  /*
   * Bu filter digunakan sebagai lapisan pengaman kedua.
   * Jika Gemini secara tidak sengaja memasukkan instruksi
   * atau informasi yang seharusnya tidak masuk ke image model,
   * bagian tersebut dibuang.
   */

  const forbiddenPatterns = [
    /\btypography\b/gi,
    /\bheadline\b/gi,
    /\bcaption\b/gi,
    /\bslogan\b/gi,
    /\bcall to action\b/gi,
    /\bcontact information\b/gi,
    /\bcontact details\b/gi,
    /\bphone number\b/gi,
    /\btelephone number\b/gi,
    /\baddress\b/gi,
    /\bwebsite\b/gi,
    /\bURL\b/gi,
    /\bprice\b/gi,
    /\bdiscount\b/gi,
    /\bsalary\b/gi,
    /\blogo\b/gi,
  ];

  for (const pattern of forbiddenPatterns) {
    result = result.replace(pattern, "");
  }

  // Strip markdown formatting symbols
  result = result
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s+/gm, "");

  /*
   * Hilangkan whitespace berlebihan.
   */
  result = result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();

  return result;
}

export async function optimizeDesignVisualPrompt(
  prompt: string
): Promise<string> {
  if (!apiKey || !ai) {
    throw new Error(
      "GEMINI API key untuk AI Design belum dikonfigurasi."
    );
  }

  const userBrief = prompt.trim();

  if (!userBrief) {
    throw new Error(
      "Design brief tidak boleh kosong."
    );
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${DESIGN_PROMPT_SYSTEM_INSTRUCTION}

USER DESIGN BRIEF:

${userBrief}

Now produce ONLY the clean English visual scene description.
`,
    config: {
      maxOutputTokens: 2048,
    },
  });

  const result = response.text?.trim();

  if (!result) {
    throw new Error(
      "Gemini tidak berhasil membuat visual prompt."
    );
  }

  const cleaned = cleanVisualPrompt(result);

  if (!cleaned) {
    throw new Error(
      "Gemini menghasilkan visual prompt yang kosong setelah proses keamanan."
    );
  }

  console.log(
    "========== GEMINI VISUAL PROMPT =========="
  );

  console.log(cleaned);

  console.log(
    "==========================================="
  );

  return cleaned;
}