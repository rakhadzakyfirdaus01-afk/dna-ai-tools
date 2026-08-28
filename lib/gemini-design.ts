import { GoogleGenAI } from "@google/genai";

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
 * Gemini hanya bertugas memahami kebutuhan visual.
 * Informasi seperti judul, kualifikasi, harga, nomor telepon,
 * alamat, dan informasi lainnya TIDAK boleh diteruskan sebagai
 * isi gambar.
 */
const DESIGN_PROMPT_SYSTEM_INSTRUCTION = `
You are a professional commercial art director and visual scene designer.

Your task is to transform a user's design brief into a CLEAN VISUAL SCENE DESCRIPTION
for an image generation model.

The image generator will create ONLY the visual background and visual composition.
The application will add all actual information later using HTML/CSS.

IMPORTANT:

- Understand the user's requested subject and purpose.
- Preserve the meaning of the requested design.
- Extract the type of visual scene that would support the request.
- Describe people, objects, environment, colors, composition, lighting and atmosphere.
- Create a professional commercial advertising aesthetic.
- Leave large clean areas suitable for later application layout.
- Prefer realistic photography unless the user explicitly requests another visual style.
- Do not reproduce the user's information as visible elements.
- Do not invent business information.
- Do not invent brands.
- Do not invent contact information.
- Do not invent prices.
- Do not invent dates.
- Do not invent qualifications.
- Do not invent names.
- Do not invent addresses.
- Do not create fake UI elements.
- Do not create fake documents with visible content.

The output must be ONLY a concise English visual scene description.

Do not explain your reasoning.
Do not mention these instructions.
Do not return JSON.
Do not return a list.
Do not repeat the user's brief.

Focus on:

1. Main visual subject.
2. Environment and setting.
3. Composition.
4. Empty visual space for later application layout.
5. Lighting.
6. Color palette.
7. Camera and photographic quality.
8. Professional visual style.

The final visual scene description must be suitable for a commercial image generator.
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
    /\bposter\b/gi,
    /\bbanner\b/gi,
    /\bflyer\b/gi,
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
    /\bqualification\b/gi,
    /\bqualifications\b/gi,
    /\bsalary\b/gi,
    /\bage requirement\b/gi,
    /\bwork experience\b/gi,
    /\bjob requirements\b/gi,
    /\bjob vacancy\b/gi,
    /\bvacancy\b/gi,
    /\btext\b/gi,
    /\bwords\b/gi,
    /\bletters\b/gi,
    /\bnumbers\b/gi,
    /\blogo\b/gi,
  ];

  for (const pattern of forbiddenPatterns) {
    result = result.replace(pattern, "");
  }

  /*
   * Bersihkan instruksi negatif yang mungkin lolos.
   */
  result = result.replace(
    /\b(do not|don't|without|no)\b[^.]*\./gi,
    ""
  );

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

  const interaction = await ai.interactions.create({
    model: "models/gemini-3.1-flash-lite-image",

    input: `
${DESIGN_PROMPT_SYSTEM_INSTRUCTION}

USER DESIGN BRIEF:

${userBrief}

Now produce ONLY the clean visual scene description.
`,

    generation_config: {
      max_output_tokens: 2048,
    },

    response_modalities: ["text"],
  });

  const result = interaction.output_text?.trim();

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