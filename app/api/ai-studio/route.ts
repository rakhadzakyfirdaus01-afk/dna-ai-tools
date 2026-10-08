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

      let isMockupDetected = false;
      let billboardBoundingBox: [number, number, number, number] = [0, 0, 1000, 1000];
      let adGraphicPrompt = "";
      let fullVisualPrompt = "";

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
                  text: `You are the SUPREME ART DIRECTOR & VISION INTELLIGENCE SYSTEM for commercial advertising and photography.
You natively understand ALL global languages, especially Bahasa Indonesia (including modern slang, colloquial phrases like 'tampilkan iklan mobil di bilboard ini', 'pasang iklan sepatu', 'ganti poster', 'baliho', 'reklame', 'papan iklan', 'kasih efek seger', 'bikinin', 'jreng', 'mewah').

Analyze this uploaded reference photo:
- Target Scene / Setting: "${selectedScene}"
- User Request / Ad Brief: "${customPrompt || "none"}"

DETERMINE:
1. isBillboardOrMockup: (boolean)
   Is this photo an outdoor billboard, digital billboard, street hoarding, banner frame, display screen, poster mockup, canvas frame, or empty display board where an advertisement or graphic should be mounted?
   (Also check if user request explicitly says 'billboard', 'baliho', 'reklame', 'papan', 'banner', 'iklan').

2. billboardBox: [ymin, xmin, ymax, xmax] (array of 4 numbers, normalized 0 to 1000)
   If isBillboardOrMockup is true, pinpoint the precise bounding box of the display/canvas area where the advertisement should be mounted:
   - ymin: top boundary of the display board (0-1000)
   - xmin: left boundary of the display board (0-1000)
   - ymax: bottom boundary of the display board (0-1000)
   - xmax: right boundary of the display board (0-1000)
   If not a mockup, return [0, 0, 1000, 1000].

3. adPrompt: (string)
   A standalone, breathtaking, high-impact commercial print advertising poster prompt for FLUX diffusion model to generate the exact graphic for this billboard canvas. Specify the requested subject (e.g., sleek red sports car, beverage bottle, tech gadget), dynamic studio or outdoor automotive lighting, bold modern typography keywords, crisp commercial graphic design aesthetic.
   (IMPORTANT: Do NOT describe the outer billboard pole or environment here - this prompt is strictly for the 2D key visual graphic itself!).

4. fullVisualPrompt: (string)
   A hyper-realistic FLUX visual prompt describing the complete scene:
   - If mockup: describe the whole environment with the billboard prominently displaying the advertisement, architectural details, trees, sky, lighting.
   - If physical product: "Commercial product catalog photography of [exact product from photo] placed on ${selectedScene}, softbox studio lighting, 85mm macro lens, sharp focus, 8K UHD."

CRITICAL: Return strictly valid JSON with no markdown wrapping:
{
  "isBillboardOrMockup": boolean,
  "billboardBox": [ymin, xmin, ymax, xmax],
  "adPrompt": "string",
  "fullVisualPrompt": "string"
}`,
                },
              ],
              config: {
                responseMimeType: "application/json",
                maxOutputTokens: 1024,
              },
            });

            if (visionResponse.text?.trim()) {
              try {
                const cleanedJson = visionResponse.text
                  .replace(/```json/gi, "")
                  .replace(/```/g, "")
                  .trim();
                const parsed = JSON.parse(cleanedJson);

                isMockupDetected = Boolean(parsed.isBillboardOrMockup);
                if (Array.isArray(parsed.billboardBox) && parsed.billboardBox.length === 4) {
                  billboardBoundingBox = parsed.billboardBox.map((n: any) =>
                    Math.max(0, Math.min(1000, Math.round(Number(n) || 0)))
                  ) as [number, number, number, number];
                }
                adGraphicPrompt = (parsed.adPrompt || "").replace(/\n/g, " ").trim();
                fullVisualPrompt = (parsed.fullVisualPrompt || "").replace(/\n/g, " ").trim();

                if (adGraphicPrompt || fullVisualPrompt) {
                  break keyLoop;
                }
              } catch (parseErr) {
                console.warn("JSON parsing error from Gemini vision:", parseErr);
              }
            }
          } catch (modelErr: any) {
            console.warn(`Gemini staging fallback [${modelName}]:`, modelErr?.status || modelErr?.message || modelErr);
            // Continue to next model/key
          }
        }
      }

      // ZERO-DOWNTIME HEURISTIC FALLBACK (If Gemini quotas or JSON fails)
      const isBillboardText =
        preset.startsWith("billboard") ||
        /billboard|reklame|papan|baliho|banner|iklan/i.test(customPrompt);

      if (!isMockupDetected && isBillboardText) {
        isMockupDetected = true;
        billboardBoundingBox = [220, 260, 480, 740];
      }

      const translatedTopic = customPrompt
        ? translateIndonesianBriefToEnglish(customPrompt)
        : "a sleek luxury electric sports car with bold advertising typography";

      if (!adGraphicPrompt) {
        adGraphicPrompt = `A stunning, high-impact commercial print advertising poster featuring ${translatedTopic}, vibrant saturated colors, dramatic cinematic lighting, bold modern typography, razor-sharp vector-grade detail, 8K UHD graphic design`;
      }

      if (!fullVisualPrompt) {
        if (isMockupDetected) {
          fullVisualPrompt = `A commercial mockup photograph of a giant outdoor rectangular billboard dominating the center frame, mounted high on a sturdy steel support pillar. The billboard's entire display face is filled with an illuminated, vibrant commercial print advertisement featuring: ${translatedTopic}. In the background are green roadside trees and city buildings under a bright daylight sky. 8K UHD commercial photography, razor-sharp focus on the billboard.`;
        } else {
          fullVisualPrompt = `Commercial luxury product catalog photography, hero product centered in the foreground in an exquisite setting: ${selectedScene}, soft diffused softbox studio lighting, 85mm macro lens, sharp focus on product, clean background, 8K UHD, photorealistic render, clean frame, no watermark`;
        }
      }

      // Ensure length stays safe for HTTP request
      if (adGraphicPrompt.length > 900) {
        adGraphicPrompt = adGraphicPrompt.slice(0, 900).replace(/\s+\S*$/, "");
      }
      if (fullVisualPrompt.length > 900) {
        fullVisualPrompt = fullVisualPrompt.slice(0, 900).replace(/\s+\S*$/, "");
      }

      const seed = Math.floor(Math.random() * 2_000_000_000);
      const stagedImageUrl = `${POLLINATIONS_BASE}/${encodeURIComponent(fullVisualPrompt)}?model=flux&width=${width}&height=${height}&nologo=true&private=true&enhance=false&seed=${seed}`;

      let adImageUrl = "";
      if (isMockupDetected) {
        const boxW = Math.max(1, billboardBoundingBox[3] - billboardBoundingBox[1]);
        const boxH = Math.max(1, billboardBoundingBox[2] - billboardBoundingBox[0]);
        let adW = 1024;
        let adH = 512;
        if (boxW / boxH > 1.8) {
          adW = 1280;
          adH = 512;
        } else if (boxH / boxW > 1.2) {
          adW = 768;
          adH = 1024;
        } else {
          adW = 1024;
          adH = 768;
        }

        adImageUrl = `${POLLINATIONS_BASE}/${encodeURIComponent(adGraphicPrompt)}?model=flux&width=${adW}&height=${adH}&nologo=true&private=true&enhance=false&seed=${seed + 7}`;
      }

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
                title: isMockupDetected
                  ? "AI Design: Mockup Billboard Reklame"
                  : "AI Design: Staging Foto Produk",
                feature: "AI Design",
                prompt: isMockupDetected ? adGraphicPrompt : fullVisualPrompt,
                result: adImageUrl || stagedImageUrl,
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
        isMockup: isMockupDetected,
        billboardBox: billboardBoundingBox,
        adImageUrl: adImageUrl,
        resultUrl: stagedImageUrl,
        prompt: isMockupDetected ? adGraphicPrompt : fullVisualPrompt,
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