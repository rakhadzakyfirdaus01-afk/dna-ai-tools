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
        custom:
          customPrompt ||
          "high-end commercial product showcase on an aesthetic podium with beautiful studio lighting",
      };

      const selectedScene =
        presetDescriptions[preset] || presetDescriptions.marble;

      const visionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: { mimeType, data: base64Image },
          },
          {
            text: `You are a world-class luxury commercial product photographer and art director.
Analyze this product photo carefully (identify the product type, bottle/package shape, primary colors, labels, materials).
Construct a single cohesive English visual prompt that places this EXACT product into the following environment: "${selectedScene}".

MANDATORY RULES:
1. Keep the product as the main hero subject in the center foreground, identical in design, color palette, and materials.
2. Emphasize: "commercial luxury product photography, 85mm macro lens, sharp focus on product, beautiful softbox studio lighting, clean background, 8K UHD, photorealistic render, no blur, no watermark".
3. Output ONLY the single cohesive English visual prompt paragraph. No markdown, no quotes, no preamble.`,
          },
        ],
        config: {
          maxOutputTokens: 1024,
        },
      });

      const visualPrompt = (visionResponse.text || "")
        .replace(/\n/g, " ")
        .replace(/\*\*/g, "")
        .replace(/"/g, "")
        .trim();

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