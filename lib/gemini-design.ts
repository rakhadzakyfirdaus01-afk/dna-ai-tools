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
 * 100X HYPER-INTELLIGENCE: SUPREME CHIEF CREATIVE OFFICER & MAESTRO ART DIRECTOR
 * Khusus Desain Grafis, Periklanan Komersial, Poster, Billboard, Branding & Visual Art.
 * Memiliki kecerdasan visual, pemahaman layout, dan standard estetika setara Cannes Lions Grand Prix & Pentagram Design.
 */
const MASTER_DESIGN_PROMPT_INSTRUCTION = `
You are the SUPREME CHIEF CREATIVE OFFICER & MASTER COMMERCIAL VISUAL ART DIRECTOR (100X HYPER-INTELLIGENCE) of DNA AI Platform.
Your cognitive visual reasoning, advertising design mastery, composition architecture, and prompt engineering for diffusion models (FLUX) are the absolute pinnacle of AI intelligence.

Your mission is to transform any user design brief (in Indonesian or English) into an extraordinary, ultra-detailed English visual prompt (100 to 140 words, ~650 to 800 characters) that guides FLUX to generate award-winning visual masterpieces.

==================================================
UNIVERSAL MULTILINGUAL & INDONESIAN MASTERY:
==================================================
You possess native, fluent comprehension of ALL global languages, with SUPREME EXPERTISE in Bahasa Indonesia, including:
- Indonesian slang, colloquial idioms, regional dialects (Jawa, Sunda, Jakarta Gaul), culinary terms, and abbreviations (e.g. 'bikinin poster', 'jreng', 'mantap jiwa', 'seger banget', 'gokil', 'ayam krispi', 'ayam geprek', 'pecel lele', 'kopi susu gula aren', 'spanduk pecel', 'reklame baliho', 'kaos distro', 'baju lebaran gamis', 'diskon gede-gedean').
- You must instantly deconstruct the cultural, commercial, and aesthetic intent, translating it seamlessly into world-class English visual prompt terminology that diffusion models (FLUX) interpret with 100% precision.
- English, Japanese, Chinese, Arabic, French, German, Spanish, and all other languages are equally understood at a native bilingual maestro level.

==================================================
7 MASTER PILARS OF 100X COMMERCIAL DESIGN MASTERY:
==================================================

1. 🎯 DEEP SEMANTIC INTENT & ADVERTISING CATEGORY EXPANSION:
   - Deeply analyze the user brief and adapt the visual strategy:
     * FOOD & BEVERAGE (F&B / Kuliner): Mouthwatering commercial culinary hero shot. Glistening juicy textures, golden-brown crunchy flakes, delicate wisps of steam, appetizing red chili & herb garnish, warm ambient backlighting, dynamic studio bounce.
     * OUTDOOR ADVERTISING (Billboard / Baliho / Reklame / Mockup): MANDATORY: Depict a colossal modern outdoor billboard structure with architectural steel frame beside a scenic highway or iconic metropolitan skyline. The billboard face is BRILLIANTLY ILLUMINATED, featuring the user's requested advertisement vividly printed on the display board with high contrast and crystal clarity (never a dark unlit board). Road below is clean and empty.
     * COMMERCIAL POSTER & FLYER (Promo, Diskon, Event, Recruitment): Professional advertising composition. Eye-catching hero visual, balanced graphic framing, designated negative space for elegance, high contrast.
     * BRANDING & LOGO / MASCOT: Bold iconic emblem, clean vector-inspired geometry or 3D metallic/glass badge, vibrant cohesive color palette, centered on a minimalist studio backdrop.
     * LUXURY PRODUCTS, TECH & COSMETICS: Minimalist Apple/Vogue luxury aesthetic. Polished marble or obsidian pedestal, pristine reflections, softbox studio key light, pristine materials.
     * GAMING, ANIME & CINEMATIC FANTASY: Unreal Engine 5 AAA cinematic keyframe, epic scale, hyper-detailed costumes, volumetric rim lighting, dramatic atmosphere.

2. ✍️ TYPOGRAPHIC HIERARCHY & GRAPHIC LAYOUT:
   - When the user mentions specific text (e.g. title "AYAM CRISPY", price "Rp 10.000", discount "50% OFF", slogan):
     * EXPLICITLY specify the typography placement in the scene: "with bold prominent graphic typography reading '[EXACT TEXT]' in modern stylized lettering, accompanied by a clean circular promotional badge".
     * Designate dedicated, uncluttered negative space in the composition so typography stays crisp, legible, and visually harmonious.

3. 🎨 COLOR PSYCHOLOGY & HARMONY:
   - Automatically assign an impactful, industry-proven color scheme:
     * Food/Fast Food: Appetizing warm crimson red, deep amber gold, and fresh herb accents.
     * Tech/Futuristic: Cyber obsidian slate, electric cyan, and neon violet.
     * Luxury/Beauty: White Carrara marble, champagne gold, and soft pastel botanical hues.
     * Corporate/Recruitment: Trustworthy navy blue, slate gray, and crisp white.

4. 📸 OPTICAL DIRECTION & STUDIO LIGHTING:
   - Master photographic optics: Hasselblad H6D-100c medium format clarity, 85mm f/1.4 commercial lens, tack-sharp focal point, delicate shallow depth of field (bokeh background), professional three-point softbox studio lighting, dramatic volumetric rim highlights.

5. 📐 COMPOSITION ARCHITECTURE:
   - Dynamic golden ratio or rule-of-thirds composition. Strong focal hero subject in foreground/center, layered depth, and balanced negative space.

6. ⚡ TOKEN DENSITY & FLUX OPTIMIZATION:
   - Keep prompt length between 100 to 140 words (around 650 to 800 characters) - the absolute sweet spot for FLUX attention.
   - Include positive quality boosters: "commercial advertising masterpiece, 8K UHD, razor-sharp focus, pristine print clarity, photorealistic textures".
   - Include negative constraints inside the prompt: "no blur, no dark unlit mockups, no plastic sheen, no watermark, no cropped elements".

7. 🚫 STRICT OUTPUT FORMAT:
   - Output MUST be 100% in English.
   - Output ONLY the single cohesive descriptive paragraph.
   - NEVER use markdown formatting (no **, no *, no #, no bullet points).
   - NEVER include conversational preambles (e.g. "Here is the prompt:").
`;

/**
 * 100X SUPREME VISION & REVERSE-ENGINEERING ART DIRECTOR
 * Merekonstruksi foto referensi dengan ketelitian 100X lipat tanpa kehilangan subjek
 */
const IMAGE_REPLICATION_SYSTEM_INSTRUCTION = `
You are the SUPREME CHIEF VISION ARCHITECT & REVERSE-ENGINEERING ART DIRECTOR (100X HYPER-INTELLIGENCE) for state-of-the-art diffusion models (FLUX).
Your visual perception, spatial reasoning, and artistic decomposition exceed all conventional models.

Your mission is to deeply analyze the attached reference image and construct an extraordinary English visual prompt (100 to 140 words, ~650 to 800 characters) that faithfully reconstructs or enhances the image according to the user brief.

==================================================
CRITICAL MULTI-ENTITY & SPATIAL DECOMPOSITION:
==================================================

1. COMPOSITION & ASPECT RATIO:
   - Establish the scene framing immediately (e.g. "Wide cinematic commercial composition:", "Vertical commercial poster layout:").

2. STRICT SPATIAL ISOLATION (ZERO ENTITY DROPPING OR MERGING):
   - When multiple subjects exist (e.g. character + companion animal, bottle + ingredients, product + mockup frame):
     * Explicitly position each entity: "In the center foreground: [detailed description of entity 1]. On the left: [detailed description of entity 2]. On the right: [detailed description of entity 3]."
     * Explicitly detail biological and physical traits (e.g. grizzly bear animal with fur and claws, humanoid warrior, metallic bottle) so FLUX never confuses or merges two different entities.

3. ADAPTIVE STAGING & USER INSTRUCTION:
   - If user asks to replicate ("buat gambar persis seperti ini"): Faithfully mirror all colors, poses, lighting, materials, and backdrops.
   - If image contains a billboard, banner, or mockup:
     * The VERY FIRST WORDS MUST BE: "A commercial mockup photograph of a giant outdoor billboard dominating the center and upper frame, mounted on a sturdy pillar."
     * The second sentence specifies the printed ad: "The entire rectangular billboard canvas is filled edge-to-edge with an illuminated, ultra-vivid printed graphic advertisement: [describe the user's requested ad with modern typography]."
     * The surroundings must match the photo: "The background retains the trees, city buildings, and daylight sky from the reference photo."
     * STRICT NEGATIVE: "The advertised subject exists strictly as a 2D graphic poster printed on the billboard; no vehicles on the road, no dark unlit screen. Sharp focus on the billboard."
   - If user asks for other modifications: Harmoniously integrate changes while preserving the core subject's identity.

4. TECHNICAL EXCELLENCE:
   - 8K UHD, commercial photography grade, tack-sharp focus on hero subjects, dramatic cinematic rim lighting, rich volumetric atmosphere, no blur, no watermark.

5. OUTPUT RULES:
   - Output MUST be ONLY in English.
   - Single cohesive paragraph (70 to 95 words for optimal FLUX attention).
   - No markdown bolding (**), no bullet points, no preamble like "Here is the prompt:".
   - Directly output ONLY the final visual prompt.
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

function getCandidateKeys(): string[] {
  return [
    process.env.GEMINI_IMAGE_PROMPT_API_KEY,
    process.env.GEMINI_AI_DESIGN_API_KEY,
    process.env.GEMINI_CODE_API_KEY,
    process.env.GEMINI_DEBUGGER_API_KEY,
    process.env.GEMINI_DOCUMENT_API_KEY,
    process.env.GEMINI_OCR_API_KEY,
    process.env.GEMINI_TRANSLATOR_API_KEY,
    process.env.GEMINI_API_KEY,
  ].filter((k): k is string => Boolean(k && k.trim() && k !== "ISI_NILAI_ASLI"));
}

const CANDIDATE_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
];

export type DesignPromptOptions = {
  designType?: string;
  style?: string;
  template?: string;
  color?: string;
};

/**
 * Penterjemah Semantik Cerdas Bahasa Indonesia & Bahasa Daerah ke Bahasa Visual Komersial Inggris
 * Mengubah slang, dialek, dan istilah kuliner / produk lokal menjadi deskripsi visual akurat untuk FLUX.
 */
export function translateIndonesianBriefToEnglish(rawBrief: string): string {
  let text = rawBrief.trim();
  if (!text) return "commercial advertising visual";

  // Kamus normalisasi dialek, kuliner, dan slang Indonesia
  const dict: [RegExp, string][] = [
    // billboard / reklame
    [/tampilkan\s+iklan\s+mobil\s+di\s+bil+board\s+ini/gi, "a sleek luxury electric sports car advertisement printed on this billboard"],
    [/pasang\s+iklan\s+mobil\s+di\s+bil+board/gi, "a luxury sports car advertisement displayed on the billboard"],
    [/di\s+bil+board\s+ini/gi, "on the billboard"],
    [/bil+board/gi, "billboard"],
    [/reklame/gi, "advertising billboard"],
    [/baliho/gi, "outdoor advertising hoarding"],
    [/papan\s+iklan/gi, "commercial billboard"],
    [/spanduk/gi, "promotional banner"],

    // mobil & otomotif
    [/mobil\s+sport\s+listrik/gi, "sleek electric sports car"],
    [/mobil\s+sport/gi, "luxury sports car"],
    [/mobil\s+balap/gi, "aerodynamic race car"],
    [/mobil\s+mewah/gi, "ultra-luxurious executive sedan"],
    [/mobil/gi, "modern luxury car"],
    [/motor\s+gede|moge/gi, "high-performance heavy motorcycle"],
    [/motor\s+listrik/gi, "futuristic electric scooter motorcycle"],
    [/motor/gi, "modern motorbike"],

    // makanan & kuliner
    [/ayam\s+crispy|ayam\s+krispi|ayam\s+goreng\s+krispi/gi, "golden-brown crispy crunchy fried chicken"],
    [/ayam\s+goreng/gi, "succulent fried chicken"],
    [/ayam\s+bakar/gi, "glistening charred grilled chicken with sweet glaze"],
    [/ayam\s+geprek/gi, "crushed crispy chicken with spicy red chili sambal"],
    [/pecel\s+lele/gi, "crispy fried catfish with red chili sambal and fresh basil"],
    [/nasi\s+goreng/gi, "aromatic wok-tossed Indonesian fried rice with sunny side egg"],
    [/mie\s+ayam/gi, "savory chicken noodles with scallions and crispy wonton"],
    [/bakso/gi, "piping hot beef meatball soup with glass noodles and broth"],
    [/sate\s+ayam/gi, "grilled chicken skewers with glistening peanut sauce"],
    [/kopi\s+susu\s+gula\s+aren/gi, "artisanal iced coffee with fresh milk and palm sugar"],
    [/kopi\s+susu/gi, "iced coffee latte with creamy milk foam"],
    [/es\s+kopi/gi, "iced cold brew coffee with frosty condensation"],
    [/kopi/gi, "aromatic premium roasted coffee"],
    [/burger/gi, "gourmet double patty cheeseburger with melted cheddar and fresh lettuce"],
    [/minuman\s+boba/gi, "creamy brown sugar bubble milk tea with tapioca pearls"],
    [/jus\s+buah/gi, "vibrant fresh cold-pressed fruit juice with ice cubes"],

    // pakaian & fashion
    [/baju\s+batik\s+modern|batik\s+modern/gi, "contemporary Indonesian batik fashion with intricate golden patterns"],
    [/baju\s+batik|batik/gi, "traditional Indonesian batik attire"],
    [/baju\s+lebaran|gamis/gi, "elegant modern Islamic festive apparel with delicate embroidery"],
    [/kaos\s+distro|kaos\s+streetwear/gi, "urban streetwear graphic t-shirt mockup"],
    [/sepatu\s+sneaker|sneaker/gi, "modern designer urban sneakers"],
    [/sepatu/gi, "stylish footwear shoes"],

    // kosmetik & kecantikan
    [/parfum\s+mewah|parfum/gi, "luxury fragrance perfume bottle with glistening liquid"],
    [/skincare\s+serum|serum\s+wajah|serum/gi, "radiant beauty skincare serum bottle with dropper"],
    [/lipstik/gi, "luxury satin matte lipstick with rich pigment"],
    [/sabun\s+cuci\s+muka|facial\s+wash/gi, "cleansing facial foam tube with splash of water"],

    // kata sifat & slang
    [/renyah|garing/gi, "crunchy golden crispy texture"],
    [/menggugah\s+selera/gi, "mouthwatering appetizing"],
    [/jreng|menyala/gi, "vibrant saturated high-contrast"],
    [/seger|segar/gi, "fresh crisp with chilled condensation droplets"],
    [/adem/gi, "calm serene ambient"],
    [/mewah/gi, "luxurious opulent"],
    [/keren/gi, "sleek impressive modern"],
    [/elegan/gi, "elegant sophisticated"],
    [/pedas/gi, "fiery spicy"],
    [/diskon\s+gede|diskon\s+besar/gi, "massive mega discount sale"],
    [/promo\s+murah/gi, "special promotional offer"],
    [/murah\s+meriah/gi, "affordable best value deal"],
    [/buatkan|bikin|bikinin|tolong\s+buat/gi, "create"],
    [/dengan\s+judul|berjudul/gi, "with prominent headline typography reading"],
    [/warna/gi, "color scheme"],
    [/merah\s+dan\s+kuning/gi, "crimson red and golden amber yellow"],
    [/merah/gi, "crimson red"],
    [/kuning/gi, "golden yellow"],
    [/biru\s+gelap/gi, "deep navy blue"],
    [/emas/gi, "metallic gold"],
    [/hitam/gi, "matte obsidian black"],
    [/putih/gi, "pure minimalist white"],
  ];

  for (const [pattern, replacement] of dict) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

/**
 * 100X Heuristic emergency visual prompt generator if all Gemini API quotas are exhausted (429)
 */
function generateHeuristicPrompt(brief: string, options?: DesignPromptOptions): string {
  const normalizedBrief = translateIndonesianBriefToEnglish(brief);
  const lower = brief.toLowerCase();
  const styleHint = options?.style && options.style !== "Auto" ? options.style : "award-winning commercial advertising";
  const typeHint = options?.designType && options.designType !== "Auto" ? options.designType : "";

  // 1. Food & Culinary (Ayam, Kopi, Burger, Pizza, Makanan, Minuman)
  if (lower.includes("ayam") || lower.includes("chicken") || lower.includes("makanan") || lower.includes("kuliner") || lower.includes("kopi") || lower.includes("burger") || lower.includes("resto") || lower.includes("food")) {
    return `An award-winning commercial food advertising poster showcasing ${normalizedBrief}. Glistening golden-brown crispy textures, mouthwatering crunchy coating, delicate aromatic steam, fresh red chili and herb garnish, bold modern typography and promotional pricing badge, dynamic warm crimson red and golden amber lighting, 85mm macro lens, tack-sharp focus, delicious culinary photography, 8K UHD, no blur, no watermark.`;
  }

  // 2. Billboard & Outdoor Advertising
  if (lower.includes("billboard") || lower.includes("reklame") || lower.includes("baliho") || lower.includes("papan iklan") || lower.includes("hoarding")) {
    return `A commercial mockup photograph of a giant outdoor rectangular billboard dominating the center frame, mounted high on a sturdy steel support pillar. The billboard face is brilliantly illuminated, featuring an ultra-sharp, high-contrast commercial advertising print of ${normalizedBrief}. Architectural steel frame, realistic spotlights, crystal clear reflections, clean empty highway below, 8K UHD commercial photography, razor-sharp focus, masterpiece, no vehicles on the road, no watermark.`;
  }

  // 3. Automotive / Vehicles
  if (lower.includes("mobil") || lower.includes("car") || lower.includes("motor") || lower.includes("supercar") || lower.includes("otomotif")) {
    return `An ultra-photorealistic commercial showcase of a sleek modern luxury vehicle, ${normalizedBrief}, positioned in a minimalist architectural showroom pavilion with gleaming mirror reflections, dramatic volumetric rim lighting, glowing LED headlights, pristine metallic paint finish, 85mm automotive photography, 8K UHD, razor-sharp focus, masterpiece, no watermark.`;
  }

  // 4. Cosmetics, Skincare & Luxury Goods
  if (lower.includes("kosmetik") || lower.includes("skincare") || lower.includes("parfum") || lower.includes("botol") || lower.includes("serum") || lower.includes("lipstik")) {
    return `A high-end luxury commercial beauty advertisement for ${normalizedBrief}, elegantly positioned on a polished white Carrara marble pedestal with delicate botanical monstera shadows, soft diffused studio softbox lighting, crystalline glass reflections, 8K UHD editorial beauty magazine quality, tack-sharp focus, pristine commercial clarity, masterpiece, no watermark.`;
  }

  // 5. Logo, Mascot & Branding
  if (lower.includes("logo") || lower.includes("maskot") || lower.includes("esport") || lower.includes("emblem") || lower.includes("lambang")) {
    return `A bold, iconic modern logo and brand identity design featuring ${normalizedBrief}. Clean graphic silhouette, dynamic geometric vector aesthetics with subtle 3D metallic edge accents, vibrant harmonious color palette, perfectly centered on a minimalist dark slate studio background, award-winning branding design, sharp focus, 8K UHD, no watermark.`;
  }

  // 6. Corporate, Job Vacancy, Events
  if (lower.includes("lowongan") || lower.includes("recruitment") || lower.includes("loker") || lower.includes("seminar") || lower.includes("konser") || lower.includes("event") || lower.includes("diskon") || lower.includes("promo")) {
    return `A prestigious modern commercial promotional poster design for ${normalizedBrief}. Sophisticated layout with balanced graphic composition, elegant typography framing, deep rich background with subtle ambient illumination, designated clean negative space, 8K resolution, award-winning graphic design, sharp clarity, no watermark.`;
  }

  // General Masterpiece
  return `An extraordinary, award-winning commercial visual masterpiece representing: ${normalizedBrief}. ${typeHint ? `Format: ${typeHint}. ` : ""}${styleHint} aesthetic with harmonious balanced composition, dramatic three-point cinematic lighting, ultra-detailed textures, 8K UHD, commercial advertising clarity, tack-sharp focus, vibrant colors, no watermark, no blur.`;
}

/**
 * 5X Smarter Prompt Optimization for Text Prompts with Multi-Key Rotation & Zero-Downtime Fallback
 */
export async function optimizeDesignVisualPrompt(
  prompt: string,
  options?: DesignPromptOptions
): Promise<string> {
  const userBrief = prompt.trim();

  if (!userBrief) {
    throw new Error("Design brief tidak boleh kosong.");
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

  const candidateKeys = getCandidateKeys();
  let lastError: any = null;

  if (candidateKeys.length > 0) {
    keyLoop: for (const k of candidateKeys) {
      const client = new GoogleGenAI({ apiKey: k });
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
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
          if (result) {
            const cleaned = cleanVisualPrompt(result);
            if (cleaned) {
              console.log(`[Gemini-Design] Successfully generated prompt using ${modelName}`);
              return cleaned;
            }
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.warn(`[Gemini-Design] Key rotation fallback: model ${modelName} failed (${errMsg.slice(0, 100)})`);
          if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
            // Try next model or next key
            continue;
          }
        }
      }
    }
  }

  // ZERO-DOWNTIME RESILIENT FALLBACK: Never let 429 crash the user experience
  console.warn("[Gemini-Design] All Gemini keys/models exhausted or rate-limited. Activating heuristic master prompt engine.");
  return generateHeuristicPrompt(userBrief, options);
}

/**
 * Image-to-Image Replication Engine with Gemini Vision, Multi-Key Rotation & Resilient Fallback
 */
export async function analyzeAndReplicateImageDesign(
  image: { mimeType: string; data: string },
  prompt: string,
  options?: DesignPromptOptions
): Promise<string> {
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

  const candidateKeys = getCandidateKeys();

  if (candidateKeys.length > 0) {
    keyLoop: for (const k of candidateKeys) {
      const client = new GoogleGenAI({ apiKey: k });
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const response = await client.models.generateContent({
            model: modelName,
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
          if (result) {
            const cleaned = cleanVisualPrompt(result);
            if (cleaned) {
              console.log(`[Gemini-Design Vision] Replicated successfully using ${modelName}`);
              return cleaned;
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn(`[Gemini-Design Vision] Key fallback: model ${modelName} failed (${errMsg.slice(0, 100)})`);
          continue;
        }
      }
    }
  }

  // ZERO-DOWNTIME FALLBACK FOR VISION
  console.warn("[Gemini-Design Vision] All vision keys exhausted. Activating heuristic replication prompt.");
  return generateHeuristicPrompt(userBrief, options);
}