import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { GoogleGenAI } from "@google/genai";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

import { translateIndonesianBriefToEnglish } from "@/lib/gemini-design";

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

      let visualPrompt = "";

      // MULTI-KEY & MULTI-MODEL ROTATION WITH ZERO-DOWNTIME FALLBACK
      const candidateKeys = [
        process.env.GEMINI_IMAGE_PROMPT_API_KEY,
        process.env.GEMINI_AI_DESIGN_API_KEY,
        process.env.GEMINI_CODE_API_KEY,
        process.env.GEMINI_DEBUGGER_API_KEY,
        process.env.GEMINI_DOCUMENT_API_KEY,
        process.env.GEMINI_OCR_API_KEY,
        process.env.GEMINI_TRANSLATOR_API_KEY,
        process.env.GEMINI_API_KEY,
      ].filter((k): k is string => Boolean(k && k.trim() && k !== "ISI_NILAI_ASLI"));

      const candidateModels = [
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
      ];

      keyLoop: for (const k of candidateKeys) {
        const client = new GoogleGenAI({ apiKey: k });
        for (const modelName of candidateModels) {
          try {
            const visionResponse = await client.models.generateContent({
              model: modelName,
              contents: [
                {
                  inlineData: { mimeType, data: base64Image },
                },
                {
                  text: `You are the SUPREME COMMERCIAL ART DIRECTOR & PROMPT ARCHITECT for FLUX diffusion models.
You natively understand ALL global languages, especially Bahasa Indonesia (including modern slang, colloquial phrases like 'tampilkan iklan mobil di bilboard ini', 'kasih efek seger', 'bikinin', 'jreng', 'mewah', culinary terms, and local idioms).

Analyze this uploaded reference photo:
- Target Scene / Setting: "${selectedScene}"
- User Request / Ad Brief: "${customPrompt || "none"}"

CRITICAL RULES FOR FLUX:
1. IF THE PHOTO CONTAINS A BILLBOARD, HOARDING, SCREEN, OR DISPLAY MOCKUP:
   - The billboard in the photo may currently be blank white or empty. YOU MUST NEVER describe the billboard as blank, white, or unlit!
   - The billboard display face MUST be described as BRILLIANTLY ILLUMINATED, edge-to-edge displaying an ultra-vivid, high-contrast commercial advertisement featuring the user's requested ad subject (e.g. an ultra-luxurious electric sports car in radiant red with bold modern typography reading SPEED & ELEGANCE).
   - Structure & Environment: The giant outdoor roadside billboard on its sturdy steel pillar dominates the center frame, under clear daylight sky, with the green trees and buildings from the photo in the background.
   - Strict Negative: The car is strictly a printed 2D graphic poster on the billboard. No real vehicles on the road below.

2. IF THE PHOTO IS A PHYSICAL PRODUCT (Bottle, jar, sneaker, cosmetic, watch, device):
   - The very first words must be: "Commercial product catalog photography of [exact product from photo: shape, color, label] placed in the center foreground on ${selectedScene}."
   - Softbox studio lighting, 85mm macro lens, tack-sharp focus on the product, clean background, 8K UHD.

TASK: Produce a concise, hyper-focused English visual prompt (60 to 80 words) for FLUX.
Output ONLY the final visual prompt paragraph. No markdown formatting, no preambles.`,
                },
              ],
              config: {
                maxOutputTokens: 1024,
              },
            });

            if (visionResponse.text?.trim()) {
              visualPrompt = visionResponse.text
                .replace(/\n/g, " ")
                .replace(/\*\*/g, "")
                .replace(/"/g, "")
                .replace(/^(here is the prompt:?|prompt:?)\s*/i, "")
                .trim();
              break keyLoop;
            }
          } catch (modelErr: any) {
            console.warn(`Gemini staging fallback [${modelName}]:`, modelErr?.status || modelErr?.message || modelErr);
            // Continue to next model/key
          }
        }
      }

      // ZERO-DOWNTIME HEURISTIC FALLBACK (If Gemini quotas are exhausted)
      if (!visualPrompt) {
        console.log("=== GEMINI QUOTA EXHAUSTED: ACTIVATING ADAPTIVE HEURISTIC ENGINE ===");
        const isBillboard =
          preset.startsWith("billboard") ||
          /billboard|reklame|papan|baliho|banner/i.test(customPrompt);

        const translatedTopic = customPrompt
          ? translateIndonesianBriefToEnglish(customPrompt)
          : "a sleek luxury electric sports car with bold advertising typography";

        if (isBillboard) {
          visualPrompt = `A commercial mockup photograph of a giant outdoor rectangular billboard dominating the center frame, mounted high on a sturdy steel support pillar. The billboard's entire display face is filled with an illuminated, vibrant commercial print advertisement featuring: ${translatedTopic}. In the background are green roadside trees and city buildings under a bright daylight sky. The advertised subject is strictly a printed graphic poster on the billboard canvas, no real vehicles on the street. 8K UHD commercial photography, razor-sharp focus on the billboard.`;
        } else {
          visualPrompt = `Commercial luxury product catalog photography, hero product centered in the foreground in an exquisite setting: ${selectedScene}, soft diffused softbox studio lighting, 85mm macro lens, sharp focus on product, clean background, 8K UHD, photorealistic render, clean frame, no watermark`;
        }
      }

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