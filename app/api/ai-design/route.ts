import { NextRequest, NextResponse } from "next/server";
import { optimizeDesignVisualPrompt } from "@/lib/gemini-design";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// ==========================================
// POLLINATIONS.AI — FREE IMAGE GENERATOR
// No API key required. No credits. No cost.
// Powered by FLUX model.
// ==========================================

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

function buildPollinationsUrl(
  visualPrompt: string,
  size: string,
  seed: number
): string {
  let width = 1024;
  let height = 1024;

  const lowerSize = size.toLowerCase();

  if (
    lowerSize === "landscape" ||
    lowerSize === "youtube thumbnail"
  ) {
    width = 1344;
    height = 768;
  } else if (
    lowerSize === "portrait" ||
    lowerSize === "instagram story"
  ) {
    width = 768;
    height = 1344;
  } else if (
    lowerSize === "instagram post" ||
    lowerSize === "square"
  ) {
    width = 1024;
    height = 1024;
  }

  const encoded = encodeURIComponent(visualPrompt);

  return (
    `${POLLINATIONS_BASE}/${encoded}` +
    `?model=flux` +
    `&width=${width}` +
    `&height=${height}` +
    `&nologo=true` +
    `&seed=${seed}`
  );
}

function buildFullVisualPrompt(
  basePrompt: string,
  designType: string,
  style: string,
  template: string,
  color: string
): string {
  const parts: string[] = [basePrompt.trim()];

  if (designType && designType !== "Auto") {
    parts.push(`design type: ${designType}`);
  }

  if (style && style !== "Auto") {
    parts.push(`style: ${style}`);
  }

  if (template && template !== "Auto") {
    parts.push(`template: ${template}`);
  }

  if (color && color !== "Auto") {
    parts.push(`color palette: ${color}`);
  }

  parts.push(
    "professional commercial quality, high detail, sharp focus, 8K resolution"
  );

  return parts.join(", ");
}

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // 1. READ FORM DATA
    // ==========================================

    const formData = await request.formData();

    const promptValue = formData.get("prompt");
    const prompt =
      typeof promptValue === "string" ? promptValue.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt desain wajib diisi.",
        },
        { status: 400 }
      );
    }

    const designType =
      typeof formData.get("designType") === "string"
        ? String(formData.get("designType"))
        : "Auto";

    const style =
      typeof formData.get("style") === "string"
        ? String(formData.get("style"))
        : "Auto";

    const template =
      typeof formData.get("template") === "string"
        ? String(formData.get("template"))
        : "Auto";

    const size =
      typeof formData.get("size") === "string"
        ? String(formData.get("size"))
        : "Auto";

    const color =
      typeof formData.get("color") === "string"
        ? String(formData.get("color"))
        : "Auto";

    // ==========================================
    // 2. OPTIMIZE PROMPT WITH GEMINI (FREE)
    // ==========================================
    //
    // Gemini cleans and improves the prompt before
    // sending it to the image generator.
    // If Gemini is not configured, fall back to
    // building the prompt manually.
    // ==========================================

    let visualPrompt: string;

    try {
      const optimized = await optimizeDesignVisualPrompt(prompt);
      visualPrompt = buildFullVisualPrompt(
        optimized,
        designType,
        style,
        template,
        color
      );

      console.log("=== AI DESIGN (FREE / POLLINATIONS) ===");
      console.log("USER PROMPT:", prompt);
      console.log("OPTIMIZED VISUAL PROMPT:", visualPrompt);
      console.log("SIZE:", size);
    } catch (geminiError) {
      console.warn(
        "Gemini prompt optimization skipped:",
        geminiError
      );

      // Smart translation fallback for common Indonesian design keywords
      const fallbackText = prompt
        .replace(/buat poster lowongan kerja/gi, "modern corporate job vacancy recruitment poster design")
        .replace(/lowongan kerja/gi, "corporate job recruitment")
        .replace(/latar belakang biru gelap/gi, "deep navy blue background")
        .replace(/aksen emas/gi, "elegant metallic gold accents")
        .replace(/suasana korporat elegan/gi, "elegant corporate atmosphere")
        .replace(/ada area kosong besar di tengah untuk teks/gi, "large clean empty negative space in the center framed for text")
        .replace(/pencahayaan studio/gi, "soft studio lighting, no people")
        .replace(/toko game/gi, "gaming store")
        .replace(/iklan/gi, "commercial advertisement")
        .replace(/poster/gi, "graphic design poster");

      visualPrompt = buildFullVisualPrompt(
        fallbackText,
        designType,
        style,
        template,
        color
      );

      console.log("=== AI DESIGN (FREE / POLLINATIONS, no Gemini) ===");
      console.log("USER PROMPT:", prompt);
      console.log("FALLBACK VISUAL PROMPT:", visualPrompt);
    }

    // ==========================================
    // 3. BUILD POLLINATIONS URL
    // ==========================================
    //
    // Random seed so every generation is unique.
    // The URL is the "project ID" — the status endpoint
    // decodes it and returns the image immediately.
    // ==========================================

    const seed = Math.floor(Math.random() * 2_000_000_000);

    const imageUrl = buildPollinationsUrl(visualPrompt, size, seed);

    console.log("POLLINATIONS URL:", imageUrl);
    console.log("========================================");

    // Encode the URL as the project ID so the status
    // endpoint can decode it without any extra storage.
    const projectId = Buffer.from(imageUrl, "utf8").toString("base64url");

    return NextResponse.json({
      success: true,
      projectId,
      mode: "generate",
      creditsCharged: 0,
    });
  } catch (error) {
    console.error("AI DESIGN SERVER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}