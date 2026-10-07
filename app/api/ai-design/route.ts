import { NextRequest, NextResponse } from "next/server";
import {
  optimizeDesignVisualPrompt,
  analyzeAndReplicateImageDesign,
} from "@/lib/gemini-design";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
  let width = 1344;
  let height = 768;

  const lowerSize = size.toLowerCase();

  if (
    lowerSize === "portrait" ||
    lowerSize === "instagram story" ||
    lowerSize === "9:16" ||
    lowerSize === "vertical"
  ) {
    width = 768;
    height = 1344;
  } else if (
    lowerSize === "instagram post" ||
    lowerSize === "square" ||
    lowerSize === "1:1"
  ) {
    width = 1024;
    height = 1024;
  } else {
    // Default to widescreen landscape 16:9 for cinematic composition
    width = 1344;
    height = 768;
  }

  // Safe length limit to prevent HTTP 414 URI Too Long on proxies
  const safePrompt = visualPrompt.length > 900
    ? visualPrompt.slice(0, 900).replace(/\s+\S*$/, "")
    : visualPrompt;

  const encoded = encodeURIComponent(safePrompt);

  return (
    `${POLLINATIONS_BASE}/${encoded}` +
    `?model=flux` +
    `&width=${width}` +
    `&height=${height}` +
    `&nologo=true` +
    `&private=true` +
    `&enhance=false` +
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

  if (designType && designType !== "Auto" && !basePrompt.toLowerCase().includes(designType.toLowerCase())) {
    parts.push(`design type: ${designType}`);
  }

  if (style && style !== "Auto" && !basePrompt.toLowerCase().includes(style.toLowerCase())) {
    parts.push(`style: ${style}`);
  }

  if (template && template !== "Auto" && !basePrompt.toLowerCase().includes(template.toLowerCase())) {
    parts.push(`template: ${template}`);
  }

  if (color && color !== "Auto" && !basePrompt.toLowerCase().includes(color.toLowerCase())) {
    parts.push(`color palette: ${color}`);
  }

  parts.push(
    "professional commercial quality, high detail, sharp focus, 8K resolution, no watermark"
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
    let prompt =
      typeof promptValue === "string" ? promptValue.trim() : "";

    const referenceImageFile = formData.get("referenceImage");
    let referenceImage: { mimeType: string; data: string } | null = null;

    if (
      referenceImageFile &&
      typeof referenceImageFile === "object" &&
      "arrayBuffer" in referenceImageFile &&
      typeof (referenceImageFile as File).size === "number" &&
      (referenceImageFile as File).size > 0
    ) {
      try {
        const file = referenceImageFile as File;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "image/jpeg";
        referenceImage = {
          mimeType,
          data: buffer.toString("base64"),
        };
      } catch (err) {
        console.warn("Gagal membaca file gambar referensi:", err);
      }
    }

    if (!prompt && referenceImage) {
      prompt = "buat gambar persis seperti ini";
    }

    if (!prompt && !referenceImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt desain atau gambar referensi wajib diisi.",
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
    // 2. 5X SMARTER PROMPT ENGINE (WITH VISION SUPPORT)
    // ==========================================

    let visualPrompt: string;

    try {
      if (referenceImage) {
        console.log("=== AI DESIGN: IMAGE-TO-IMAGE REPLICATION ACTIVE ===");
        const replicatedPrompt = await analyzeAndReplicateImageDesign(
          referenceImage,
          prompt,
          { designType, style, template, color }
        );
        visualPrompt = buildFullVisualPrompt(
          replicatedPrompt,
          designType,
          style,
          template,
          color
        );
      } else {
        console.log("=== AI DESIGN: 5X SMARTER TEXT-TO-IMAGE ACTIVE ===");
        const optimized = await optimizeDesignVisualPrompt(
          prompt,
          { designType, style, template, color }
        );
        visualPrompt = buildFullVisualPrompt(
          optimized,
          designType,
          style,
          template,
          color
        );
      }

      console.log("USER PROMPT:", prompt);
      console.log("FINAL VISUAL PROMPT:", visualPrompt);
      console.log("SIZE:", size);
    } catch (geminiError) {
      console.warn(
        "Gemini visual engine fallback triggered:",
        geminiError
      );

      // Smart translation fallback for common Indonesian design keywords
      const fallbackText = (prompt || "high quality commercial design")
        .replace(/buat poster lowongan kerja/gi, "modern corporate job vacancy recruitment poster design")
        .replace(/lowongan kerja/gi, "corporate job recruitment")
        .replace(/latar belakang biru gelap/gi, "deep navy blue background")
        .replace(/aksen emas/gi, "elegant metallic gold accents")
        .replace(/suasana korporat elegan/gi, "elegant corporate atmosphere")
        .replace(/ada area kosong besar di tengah untuk teks/gi, "large clean empty negative space in the center framed for text")
        .replace(/pencahayaan studio/gi, "soft studio lighting, no people")
        .replace(/toko game/gi, "gaming store")
        .replace(/iklan/gi, "commercial advertisement")
        .replace(/poster/gi, "graphic design poster")
        .replace(/bilboard|billboard/gi, "giant 3D high-resolution commercial outdoor advertising billboard mockup in modern city");

      visualPrompt = buildFullVisualPrompt(
        fallbackText,
        designType,
        style,
        template,
        color
      );

      console.log("FALLBACK VISUAL PROMPT:", visualPrompt);
    }

    // ==========================================
    // 3. BUILD POLLINATIONS URL
    // ==========================================

    const seed = Math.floor(Math.random() * 2_000_000_000);

    const imageUrl = buildPollinationsUrl(visualPrompt, size, seed);

    console.log("POLLINATIONS URL:", imageUrl);
    console.log("========================================");

    // Encode the URL as the project ID so the status
    // endpoint can decode it without extra storage.
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