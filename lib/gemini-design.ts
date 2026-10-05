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
 * 5X LEBIH PINTAR: Master Prompt Engineering Instruction untuk Desain & Visual
 * Mengubah brief pengguna menjadi deskripsi visual tingkat maestro (FLUX / Midjourney).
 */
const MASTER_DESIGN_PROMPT_INSTRUCTION = `
You are an elite, world-class commercial visual art director and master prompt engineer for state-of-the-art AI image generators (FLUX).

Your mission is to transform any user design brief (in Indonesian or English) into an extraordinary, ultra-detailed English visual prompt that produces breathtaking, award-winning visual imagery.

INTELLIGENT SCENARIO ADAPTATION:
1. Billboard & Outdoor Advertising:
   - Depict a magnificent, ultra-photorealistic commercial billboard mockup.
   - Situations: Sleek modern highway or towering skyscraper in an iconic metropolitan core (Times Square, Tokyo Shibuya, or sleek financial district) at radiant golden hour or illuminated night.
   - Colossal display with brushed steel / aluminum frame, architectural realism, crisp reflections on glass, realistic ambient lighting, professional commercial clarity.
2. Posters, Flyers & Commercial Graphics:
   - Modern advertising layout, balanced aesthetic, elegant lighting, dynamic focal point.
   - Harmonious composition with clean framed negative space for graphic elegance, studio lighting, sophisticated color grading.
3. Gaming, Fantasy & Characters:
   - AAA video game cinematic key art, Unreal Engine 5 high-fidelity render, hyper-detailed costumes/armor, dramatic volumetric rim lighting, majestic atmospheric background, epic scale.
4. Food & Culinary:
   - Mouthwatering commercial culinary photography, glistening textures, fresh ingredients, shallow depth of field, 85mm lens, softbox studio illumination.
5. Products, Tech & Luxury:
   - High-end commercial product showcase, minimalist luxury aesthetic, pristine reflective surfaces, soft gradient studio backdrop, Apple/Tesla level commercial elegance.
6. Landscapes & Architecture:
   - Architectural digest photography, sweeping panoramic vistas, golden hour illumination, volumetric atmosphere, 8K photorealism.

CORE RULES:
1. Output MUST be ONLY in English.
2. Output a single cohesive, richly descriptive paragraph (100 to 180 words).
3. Include quality boosters: "masterpiece, 8K UHD, ultra-detailed textures, sharp focus, cinematic lighting, commercial grade, no blur, no watermark".
4. Do NOT include markdown bolding (**), asterisks (*), or quotes (").
5. Never output conversational filler like "Here is the prompt:".
6. Directly output ONLY the final English visual prompt.
`;

/**
 * VISION ENGINE: Meniru foto lampiran secara detail (Image-to-Image Reproduction)
 * 5X Lebih Pintar: Menjamin semua karakter/subjek dan latar belakang ter-render utuh tanpa terpotong
 */
const IMAGE_REPLICATION_SYSTEM_INSTRUCTION = `
You are the world's foremost AI visual reverse-engineering director and master prompt architect for state-of-the-art diffusion models (FLUX).

Your mission is to deeply analyze the attached reference image and construct an extraordinary, ultra-accurate English visual prompt that faithfully reconstructs EVERY SINGLE subject, companion entity, and environmental backdrop from the reference image without dropping or merging them.

CRITICAL MULTI-ENTITY COMPOSITION ARCHITECTURE:
1. Framing & Shot Type (Must be first):
   - Always establish the composition at the very start: "Cinematic widescreen 16:9 composition, wide shot showing a multi-entity scene side by side in full view:"
2. Strict Entity Separation (Do NOT rely only on copyrighted names):
   - When multiple subjects exist (e.g. warrior and companion animal bear, two characters, person and vehicle):
     Describe them with explicit spatial positioning: "On the left: [detailed physical description of entity 1, e.g. a powerful bald Spartan warrior with dark beard, red war paint tattoos, wearing glowing golden armor and gauntlet, waist-up view]. On the right: [detailed physical description of entity 2, e.g. a colossal wild brown grizzly bear animal with thick shaggy fur, bear muzzle, claws, standing beside him]."
   - For animal companions, explicitly specify biological traits (animal, claws, shaggy fur, muzzle) so the model never renders two humans instead of an animal.
3. Dominant Environmental Background:
   - Provide a vivid, dedicated description of the background: (e.g. "Behind them is deep outer space filled with a swirling cosmic nebula of luminous purple and electric blue interstellar gas clouds, glittering stars, and levitating asteroid rocks").
4. Technical Style & Lighting:
   - "Unreal Engine 5 AAA video game cinematic keyframe, 8K UHD, photorealistic textures, dramatic cosmic rim lighting, razor sharp focus, both subjects fully visible in frame, neither cropped, no close-up portrait".

USER INTENT:
- If user requests "buat gambar persis seperti ini", "tiru foto ini", or gives a short prompt: Faithfully reproduce ALL entities, companion beasts, and background elements from the image.
- If user specifies custom changes (e.g., "ganti jadi malam", "tambahkan naga"): Seamlessly apply changes while preserving the core subjects and style.

CORE RULES:
1. Output MUST be ONLY in English.
2. Output a single cohesive descriptive paragraph (100 to 180 words).
3. Do NOT include markdown asterisks (**), bullet points, or quotes (").
4. Never output conversational preamble like "Here is the prompt:".
5. Directly output ONLY the final English visual prompt.
`;

function cleanVisualPrompt(value: string): string {
  let result = value.trim();

  // Strip conversational preambles
  result = result.replace(/^(here is the prompt:?|prompt:?|visual prompt:?)\s*/i, "");

  // Strip markdown formatting symbols
  result = result
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/`/g, "")
    .replace(/^"+|"+$/g, "");

  // Clean excessive whitespace
  result = result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();

  return result;
}

export type DesignPromptOptions = {
  designType?: string;
  style?: string;
  template?: string;
  color?: string;
};

/**
 * 5X Smarter Prompt Optimization for Text Prompts
 */
export async function optimizeDesignVisualPrompt(
  prompt: string,
  options?: DesignPromptOptions
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

  const contextHints: string[] = [];
  if (options?.designType && options.designType !== "Auto") {
    contextHints.push(`Design Type: ${options.designType}`);
  }
  if (options?.style && options.style !== "Auto") {
    contextHints.push(`Preferred Style: ${options.style}`);
  }
  if (options?.template && options.template !== "Auto") {
    contextHints.push(`Template: ${options.template}`);
  }
  if (options?.color && options.color !== "Auto") {
    contextHints.push(`Color Palette: ${options.color}`);
  }

  const contextStr = contextHints.length > 0 ? `\nADDITIONAL USER PREFERENCES:\n${contextHints.join("\n")}\n` : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
${MASTER_DESIGN_PROMPT_INSTRUCTION}

USER DESIGN BRIEF:
${userBrief}
${contextStr}
Now produce ONLY the master-level English visual scene description.
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
      "Gemini menghasilkan visual prompt yang kosong."
    );
  }

  console.log("========== 5X SMARTER VISUAL PROMPT ==========");
  console.log(cleaned);
  console.log("==============================================");

  return cleaned;
}

/**
 * Image-to-Image Replication Engine with Gemini Vision
 * Meniru foto lampiran secara akurat sesuai instruksi pengguna.
 */
export async function analyzeAndReplicateImageDesign(
  image: { mimeType: string; data: string },
  prompt: string,
  options?: DesignPromptOptions
): Promise<string> {
  if (!apiKey || !ai) {
    throw new Error(
      "GEMINI API key untuk AI Design belum dikonfigurasi."
    );
  }

  const userBrief = prompt.trim() || "buat gambar persis seperti ini";

  const contextHints: string[] = [];
  if (options?.designType && options.designType !== "Auto") {
    contextHints.push(`Design Type: ${options.designType}`);
  }
  if (options?.style && options.style !== "Auto") {
    contextHints.push(`Preferred Style: ${options.style}`);
  }
  if (options?.color && options.color !== "Auto") {
    contextHints.push(`Color Palette: ${options.color}`);
  }

  const contextStr = contextHints.length > 0 ? `\nUSER PREFERENCES:\n${contextHints.join("\n")}\n` : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      },
      {
        text: `
${IMAGE_REPLICATION_SYSTEM_INSTRUCTION}

USER INSTRUCTION:
${userBrief}
${contextStr}
Now generate ONLY the final English visual prompt that replicates and reconstructs this image faithfully.
`,
      },
    ],
    config: {
      maxOutputTokens: 2048,
    },
  });

  const result = response.text?.trim();

  if (!result) {
    throw new Error(
      "Gemini Vision tidak berhasil menganalisis gambar referensi."
    );
  }

  const cleaned = cleanVisualPrompt(result);

  if (!cleaned) {
    throw new Error(
      "Gemini Vision menghasilkan prompt yang kosong."
    );
  }

  console.log("========== REPLICATED IMAGE VISUAL PROMPT ==========");
  console.log(cleaned);
  console.log("====================================================");

  return cleaned;
}