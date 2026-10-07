import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenAI } from "@google/genai";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const apiKey =
  process.env.GEMINI_IMAGE_PROMPT_API_KEY ||
  process.env.GEMINI_AI_DESIGN_API_KEY ||
  process.env.GEMINI_DEBUGGER_API_KEY ||
  process.env.GEMINI_API_KEY ||
  "";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const formData = await request.formData();
    const action = (formData.get("action") as string) || "stage-product";
    const file = formData.get("image") as File;
    const preset = (formData.get("preset") as string) || "marble";
    const customPrompt = (formData.get("customPrompt") as string) || "";
    const size = (formData.get("size") as string) || "square";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Gambar produk wajib diunggah." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    let width = 1024;
    let height = 1024;
    if (size === "landscape") {
      width = 1344;
      height = 768;
    } else if (size === "portrait") {
      width = 768;
      height = 1344;
    }

    // ==========================================
    // 1. PRODUCT STAGING DENGAN GEMINI + FLUX
    // ==========================================
    if (action === "stage-product") {
      if (!ai) {
        return NextResponse.json(
          { success: false, error: "API Key Gemini belum disetel." },
          { status: 500 }
        );
      }

      const presetDescriptions: Record<string, string> = {
        // Physical Product Presets
        marble:
          "placed gracefully on an ultra-luxury polished white Carrara marble pedestal with delicate gold veins, soft studio key light and gentle bounce fill, high-end commercial cosmetic and luxury goods photoshoot",
        wooden:
          "resting on a rustic warm natural oak wood table, soft botanical monstera and fern leaf sunlight shadows, cozy aesthetic lifestyle cafe interior, warm daylight glow",
        nature:
          "situated on dark wet river stones surrounded by fresh morning mist, crystal clear fresh water droplets, subtle green moss, lush natural outdoor beauty atmosphere",
        pastel:
          "placed on a sleek minimalist geometric pastel pedestal, delicate architectural window shadow cast, soft editorial diffused lighting, clean Scandinavian studio aesthetic",
        cyberpunk:
          "displayed on a reflective dark metallic platform with subtle neon pink and electric cyan ambient edge lighting, modern futuristic tech gadget showcase",

        // Billboard & Display Mockup Presets
        billboard_highway:
          "a magnificent colossal outdoor highway advertising billboard structure along a scenic modern freeway, daylight illumination with crystal blue sky, displaying a breathtaking high-impact commercial key visual campaign with razor-sharp photorealistic clarity, architectural steel support pillar, realistic roadside environment",
        billboard_city:
          "a gigantic 3D LED digital advertising billboard mounted high amidst iconic towering metropolitan skyscrapers in Times Square or Tokyo Shibuya, bustling city street below, radiant ambient reflections, displaying a sensational commercial key visual advertisement in 8K UHD",
        billboard_night:
          "a colossal illuminated outdoor commercial billboard standing proudly against a dramatic twilight night sky, architectural halogen spotlights shining upwards onto the display board, sleek highway backdrop with glowing vehicle light trails, vibrant cinematic commercial poster",
        art_gallery:
          "framed in a sleek minimalist gallery exhibition frame mounted on an elegant architectural concrete museum wall, directional soft spotlighting, high-end fine art exhibition atmosphere",
        tech_mockup:
          "displayed on a sleek bezel-less modern tech device screen set on a minimalist designer desk with warm ambient lighting and architectural elegance",
        custom:
          customPrompt ||
          "high-end commercial product and advertising showcase with pristine studio lighting",
      };

      const selectedScene =
        presetDescriptions[preset] ||
        (customPrompt ? customPrompt : presetDescriptions.marble);

      const visionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: { mimeType, data: base64Image },
          },
          {
            text: `You are an elite, world-class commercial creative director, visual advertising architect, and prompt master for state-of-the-art FLUX diffusion models.

Analyze this uploaded reference photo with deep visual intelligence:

1. SUBJECT IDENTIFICATION:
   - Carefully determine what is in the photo:
     A) Is it an OUTDOOR/INDOOR DISPLAY MOCKUP (such as a roadside billboard, highway billboard, blank advertising hoarding, wall banner, poster frame, digital screen, or signage)?
     B) Is it a COMMERCIAL PHYSICAL PRODUCT (such as a bottle, perfume, shoe, sneaker, cosmetics jar, beverage, watch, tech gadget, food item, or packaged good)?
     C) Is it an architectural or general scene?

2. INTENT & STAGING TRANSFORMATION:
   - Target Environment / Preset: "${selectedScene}"
   - User Custom Brief: "${customPrompt || "none"}"

3. STRICT SCENARIO EXECUTION:
   * IF IT IS A BILLBOARD OR DISPLAY MOCKUP:
     - DO NOT put a billboard on a tabletop podium or turn it into a building bunker!
     - PRESERVE the exact perspective, viewing angle, and physical billboard structure (the large rectangular display board, steel pillar/frame, roadside/highway/urban setting) from the reference image.
     - STAGE THE DISPLAY: Depict this EXACT billboard prominently featuring an awe-inspiring, world-class commercial advertisement visual on the board display. If a user brief is given ("${customPrompt}"), stage that specific advertisement on the billboard. If no user brief is given, stage a breathtaking luxury commercial advertising visual (e.g., sleek futuristic automotive campaign or iconic high-tech key art) with razor-sharp photorealistic detail, vibrant colors, and authentic outdoor sunlight illumination matching the scene.
     - Surroundings: Realistic modern roadway, crisp blue sky, natural trees, and city backdrop faithfully aligned with the photo's camera angle and composition.

   * IF IT IS A PHYSICAL PRODUCT:
     - Keep the exact product shape, silhouette, packaging materials, and colors identical.
     - Place it as the central hero subject in the foreground of the chosen setting ("${selectedScene}").
     - 85mm macro lens, sharp razor-sharp focus on the hero product, soft diffused softbox studio lighting, clean background, 8K UHD.

4. MANDATORY QUALITY CONTROLS:
   - Emphasize: "masterpiece, commercial 8K UHD advertising key visual, ultra-sharp focus, photorealistic textures, pristine lighting, clean frame, no watermark, no text distortion, no blur, no logo artifacts".
   - Output ONLY a single cohesive, highly descriptive English visual prompt paragraph (120 to 180 words).
   - No markdown bolding (**), no bullet points, no preamble like "Here is the prompt:".`,
          },
        ],
        config: {
          maxOutputTokens: 1024,
        },
      });

      let visualPrompt = (visionResponse.text || "")
        .replace(/\n/g, " ")
        .replace(/\*\*/g, "")
        .replace(/"/g, "")
        .replace(/^(here is the prompt:?|prompt:?)\s*/i, "")
        .trim();

      // Ensure length stays safe for HTTP request
      if (visualPrompt.length > 900) {
        visualPrompt = visualPrompt.slice(0, 900).replace(/\s+\S*$/, "");
      }

      const seed = Math.floor(Math.random() * 2_000_000_000);
      const encoded = encodeURIComponent(visualPrompt);

      const stagedImageUrl = `${POLLINATIONS_BASE}/${encoded}?model=flux&width=${width}&height=${height}&nologo=true&private=true&enhance=false&seed=${seed}`;

      // Save to history if logged in
      if (session?.user?.email) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
          });
          if (user) {
            await prisma.history.create({
              data: {
                userId: user.id,
                title: "AI Design: Staging Foto Produk",
                feature: "AI Design",
                prompt: visualPrompt,
                result: stagedImageUrl,
              },
            });
          }
        } catch (dbErr) {
          console.warn("Gagal menyimpan riwayat AI Studio:", dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        action: "stage-product",
        resultUrl: stagedImageUrl,
        prompt: visualPrompt,
      });
    }

    // ==========================================
    // 2. BACKGROUND REMOVAL (HISTORY / STATUS)
    // ==========================================
    if (action === "remove-bg") {
      // Save history record if logged in
      if (session?.user?.email) {
        try {
          const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
          });
          if (user) {
            await prisma.history.create({
              data: {
                userId: user.id,
                title: "AI Design: Hapus Background",
                feature: "AI Design",
                prompt: "Penghapusan latar belakang & isolasi objek neural",
                result: "Neural High-Precision Cutout",
              },
            });
          }
        } catch (dbErr) {
          console.warn("Gagal menyimpan riwayat AI Studio:", dbErr);
        }
      }

      return NextResponse.json({
        success: true,
        action: "remove-bg",
        message: "Neural background removal processed successfully.",
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenali." },
      { status: 400 }
    );
  } catch (error) {
    console.error("AI STUDIO SERVER ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
}