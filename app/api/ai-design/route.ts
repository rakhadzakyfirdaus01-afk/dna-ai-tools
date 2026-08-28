import { NextRequest, NextResponse } from "next/server";

const MAGIC_HOUR_API_KEY =
  process.env.MAGIC_HOUR_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // 1. CEK API KEY
    // ==========================================

    if (!MAGIC_HOUR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "MAGIC_HOUR_API_KEY belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 2. AMBIL PROMPT USER
    // ==========================================

    const body = await request.json();

    const prompt =
      typeof body?.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt desain wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. PROMPT DESAIN
    // ==========================================

    const finalPrompt = `
Create a professional commercial design based
on the following user request:

${prompt}

Follow the user's request accurately.

Create the requested:
- subject
- object
- person
- product
- environment
- composition
- colors
- lighting
- visual style

Make the design suitable for:
- advertising
- social media
- promotional material
- recruitment
- marketing
- posters
- banners

QUALITY REQUIREMENTS:

Create a clean, professional and attractive
commercial design.

Make the main subject sharp and recognizable.

Use realistic proportions.

Use appropriate lighting and composition.

Avoid distorted objects.

Avoid duplicated objects.

Avoid malformed faces or hands.

Avoid unnecessary visual elements.

TEXT:

If the user's request contains text, attempt
to include the requested text clearly.

Keep requested words, numbers, prices,
dates and names as accurate as possible.

Do not intentionally add unrelated text.

Do not intentionally add random words.

Do not intentionally add random characters.

The design should visually follow the user's
request as closely as possible.
`;

    // ==========================================
    // 4. REQUEST KE MAGIC HOUR
    // ==========================================

    const response = await fetch(
      "https://api.magichour.ai/v1/ai-image-generator",
      {
        method: "POST",

        headers: {
          Accept: "application/json",

          Authorization:
            `Bearer ${MAGIC_HOUR_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          name: "AI Design",

          image_count: 1,

          aspect_ratio: "9:16",

          resolution: "640px",

          style: {
            prompt: finalPrompt,

            tool: "general",
          },
        }),
      }
    );

    // ==========================================
    // 5. BACA RESPONSE
    // ==========================================

    const data = await response.json();

    // ==========================================
    // 6. TANGANI ERROR MAGIC HOUR
    // ==========================================

    if (!response.ok) {
      console.error(
        "Magic Hour API Error:",
        data
      );

      return NextResponse.json(
        {
          success: false,

          error:
            data?.message ||
            data?.error?.message ||
            "Magic Hour gagal membuat desain.",
        },
        {
          status: response.status,
        }
      );
    }

    // ==========================================
    // 7. CEK PROJECT ID
    // ==========================================

    if (!data?.id) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Magic Hour tidak mengembalikan project ID.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // 8. BERHASIL
    // ==========================================

    return NextResponse.json({
      success: true,

      projectId: data.id,

      creditsCharged:
        data?.credits_charged ?? 0,
    });
  } catch (error) {
    // ==========================================
    // 9. SERVER ERROR
    // ==========================================

    console.error(
      "AI DESIGN SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}