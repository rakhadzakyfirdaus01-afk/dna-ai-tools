import { NextRequest, NextResponse } from "next/server";

const MAGIC_HOUR_API_KEY =
  process.env.MAGIC_HOUR_API_KEY;

const MAGIC_HOUR_API_BASE =
  "https://api.magichour.ai";

function getExtension(fileName: string, mimeType: string) {
  const fromName = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    fromName &&
    /^(png|jpg|jpeg|webp|heic|heif|avif|jp2|tiff|bmp)$/.test(
      fromName
    )
  ) {
    return fromName;
  }

  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  if (mimeType === "image/avif") return "avif";
  if (mimeType === "image/tiff") return "tiff";
  if (mimeType === "image/bmp") return "bmp";

  return "jpg";
}

async function magicHourRequest(
  path: string,
  init: RequestInit
) {
  return fetch(
    `${MAGIC_HOUR_API_BASE}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization:
          `Bearer ${MAGIC_HOUR_API_KEY}`,
        "Content-Type":
          "application/json",
        ...(init.headers || {}),
      },
    }
  );
}

async function uploadImageBytes(
  bytes: ArrayBuffer,
  fileName: string,
  mimeType: string
) {
  const extension = getExtension(
    fileName,
    mimeType
  );

  const uploadUrlResponse =
    await magicHourRequest(
      "/v1/files/upload-urls",
      {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              type: "image",
              extension,
            },
          ],
        }),
      }
    );

  const uploadUrlData =
    await uploadUrlResponse
      .json()
      .catch(() => ({}));

  if (!uploadUrlResponse.ok) {
    throw new Error(
      uploadUrlData?.message ||
        uploadUrlData?.error?.message ||
        "Gagal mendapatkan URL upload gambar."
    );
  }

  const uploadItem =
    uploadUrlData?.items?.[0];

  if (
    !uploadItem?.upload_url ||
    !uploadItem?.file_path
  ) {
    throw new Error(
      "Magic Hour tidak mengembalikan data upload gambar."
    );
  }

  const uploadResponse = await fetch(
    uploadItem.upload_url,
    {
      method: "PUT",
      headers: {
        "Content-Type":
          mimeType ||
          "application/octet-stream",
      },
      body: bytes,
    }
  );

  if (!uploadResponse.ok) {
    const uploadError =
      await uploadResponse.text().catch(
        () => ""
      );

    throw new Error(
      uploadError ||
        "Gagal mengunggah gambar ke penyimpanan Magic Hour."
    );
  }

  return uploadItem.file_path as string;
}

async function uploadReferenceImage(
  file: File
) {
  return uploadImageBytes(
    await file.arrayBuffer(),
    file.name,
    file.type
  );
}

async function uploadReferenceImageFromUrl(
  imageUrl: string
) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error(
      "URL gambar hasil sebelumnya tidak valid."
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error(
      "URL gambar hasil sebelumnya tidak didukung."
    );
  }

  const imageResponse = await fetch(
    parsedUrl.toString(),
    {
      cache: "no-store",
    }
  );

  if (!imageResponse.ok) {
    throw new Error(
      "Gagal mengambil hasil gambar sebelumnya."
    );
  }

  const contentType =
    imageResponse.headers.get(
      "content-type"
    ) || "image/jpeg";

  if (
    !contentType.startsWith("image/")
  ) {
    throw new Error(
      "URL hasil sebelumnya tidak menunjuk ke file gambar."
    );
  }

  const contentLength =
    Number(
      imageResponse.headers.get(
        "content-length"
      ) || "0"
    );

  const maxSize =
    20 * 1024 * 1024;

  if (
    contentLength > maxSize
  ) {
    throw new Error(
      "Gambar hasil sebelumnya terlalu besar."
    );
  }

  const bytes =
    await imageResponse.arrayBuffer();

  if (bytes.byteLength > maxSize) {
    throw new Error(
      "Gambar hasil sebelumnya terlalu besar."
    );
  }

  const pathname =
    parsedUrl.pathname || "";

  const fileName =
    pathname
      .split("/")
      .pop()
      ?.split("?")[0] ||
    "previous-ai-design.jpg";

  return uploadImageBytes(
    bytes,
    fileName,
    contentType
  );
}

function buildGenerationPrompt(
  prompt: string
) {
  return `
Create a high-quality visual image for DNA AI Design.

USER REQUEST:
${prompt}

==================================================
VISUAL-ONLY FREE MODE
==================================================

Generate the visual content requested by the user.

Follow the user's main subject exactly.
Do not replace the requested subject.
Do not substitute it with another related subject.

Words such as poster, banner, flyer, advertisement,
thumbnail, promotion, or social-media design describe
presentation format only. They do not change the subject.

The user's requested:
- subject
- objects
- people
- animals
- products
- environment
- setting
- composition
- perspective
- colors
- lighting
- mood
- style

must be respected.

Do not invent unrelated subjects or objects.

==================================================
TEXT RENDERING DISABLED
==================================================

DNA AI Design is currently visual-only.

Do not render any new text inside the image.

Do not add:
- letters
- words
- sentences
- numbers
- prices
- slogans
- headlines
- captions
- labels
- brand names
- product names
- logos containing text
- promotional copy
- call-to-action text
- buttons containing text
- watermarks
- typography
- fake words
- pseudo-text
- random characters

If the user asks for text, ignore only the text-rendering
part while still following the rest of the visual request.

==================================================
SUBJECT FIDELITY
==================================================

Examples:
"kucing" means an actual cat.
"anjing" means an actual dog.
"mobil sport merah" means a red sports car.
"ayam crispy" means fully cooked crispy fried chicken food.

Do not use these examples unless the user actually asks for them.

If the requested subject is food, depict the prepared edible food,
not the living source animal, unless the user explicitly asks
for the animal.

==================================================
QUALITY
==================================================

Create a professional, clean, detailed visual.

Use realistic proportions, coherent anatomy, realistic materials,
appropriate lighting, natural shadows, suitable perspective,
and a strong composition.

Use photorealism unless the user requests another style.

FINAL:
VISUAL ONLY.
NO NEW TEXT.
FOLLOW THE USER'S SUBJECT EXACTLY.
`;
}

function buildEditPrompt(
  prompt: string
) {
  return `
Edit the provided image according to the user's instruction.

USER EDIT REQUEST:
${prompt}

==================================================
EDITING RULE
==================================================

Use the provided image as the source image.

Preserve the original image everywhere except the specific
changes requested by the user.

Apply the requested edit precisely.

Examples:
- "hilangkan pintu kamar mandi"
  → remove only the bathroom door and naturally reconstruct
    the area behind it.
- "tambahkan ular di kamar mandi"
  → add a realistic snake in the bathroom while preserving
    the rest of the room.
- "ubah warna dinding menjadi putih"
  → change only the wall color while preserving the room.

Do not replace the entire scene with an unrelated image.

Do not change unrelated objects.

Do not change the camera perspective unless requested.

Do not change the original environment unless necessary for
the requested edit.

==================================================
SUBJECT CONSISTENCY
==================================================

The user's requested edit has the highest priority.

Add an object only when the user asks to add it.

Remove an object only when the user asks to remove it.

Never add unrelated objects.

Never remove unrelated objects.

Never substitute the requested object with another object.

==================================================
TEXT RENDERING DISABLED
==================================================

This DNA AI Design version is visual-only.

Do not create NEW text, labels, captions, slogans, prices,
brand names, logos, watermarks, or typography.

Do not add writing to the edited image.

Preserve existing visual content unless the user explicitly
asks to remove or change it.

==================================================
QUALITY
==================================================

Make the edit look natural and photorealistic unless the user
requests another style.

Match:
- original lighting
- original perspective
- original shadows
- original colors
- original materials
- original depth of field

Blend added objects naturally into the scene.

For object removal, reconstruct the background naturally so the
removed object is no longer visible.

FINAL:
ONLY APPLY THE REQUESTED VISUAL EDIT.
NO NEW TEXT.
PRESERVE EVERYTHING ELSE.
`;
}

export async function POST(
  request: NextRequest
) {
  try {
    // ==========================================
    // 1. API KEY
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
    // 2. READ FORM DATA
    // ==========================================
    //
    // The updated AI Design frontend sends both
    // normal prompts and optional reference images
    // as multipart/form-data.
    // ==========================================

    const formData =
      await request.formData();

    const promptValue =
      formData.get("prompt");

    const prompt =
      typeof promptValue === "string"
        ? promptValue.trim()
        : "";

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Prompt desain wajib diisi.",
        },
        { status: 400 }
      );
    }

    const designType =
      typeof formData.get("designType") ===
      "string"
        ? String(
            formData.get("designType")
          )
        : "Auto";

    const style =
      typeof formData.get("style") ===
      "string"
        ? String(
            formData.get("style")
          )
        : "Auto";

    const template =
      typeof formData.get("template") ===
      "string"
        ? String(
            formData.get("template")
          )
        : "Auto";

    const size =
      typeof formData.get("size") ===
      "string"
        ? String(
            formData.get("size")
          )
        : "Auto";

    const color =
      typeof formData.get("color") ===
      "string"
        ? String(
            formData.get("color")
          )
        : "Auto";

    const referenceValue =
      formData.get("referenceImage");

    const referenceImage =
      referenceValue instanceof File &&
      referenceValue.size > 0
        ? referenceValue
        : null;

    const previousImageUrlValue =
      formData.get("referenceImageUrl");

    const previousImageUrl =
      typeof previousImageUrlValue ===
      "string"
        ? previousImageUrlValue.trim()
        : "";

    // ==========================================
    // 3. REFERENCE IMAGE VALIDATION
    // ==========================================

    if (referenceImage) {
      if (
        !referenceImage.type.startsWith(
          "image/"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "File lampiran harus berupa gambar.",
          },
          { status: 400 }
        );
      }

      // Prevent unexpectedly huge uploads from
      // reaching the external API.
      const maxSize =
        20 * 1024 * 1024;

      if (referenceImage.size > maxSize) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Ukuran gambar terlalu besar. Maksimal 20 MB.",
          },
          { status: 400 }
        );
      }
    }

    // ==========================================
    // 4. EDIT MODE
    // ==========================================
    //
    // If a reference image file OR a previous generated
    // image URL exists, use the image editor.
    //
    // This enables edit chaining:
    // original -> edit 1 -> edit 2 -> edit 3
    // ==========================================

    if (
      referenceImage ||
      previousImageUrl
    ) {
      const filePath =
        referenceImage
          ? await uploadReferenceImage(
              referenceImage
            )
          : await uploadReferenceImageFromUrl(
              previousImageUrl
            );

      const editPrompt =
        buildEditPrompt(prompt);

      console.log(
        "================================="
      );
      console.log(
        "AI DESIGN MODE: IMAGE EDIT"
      );
      console.log(
        "AI DESIGN USER PROMPT:"
      );
      console.log(prompt);
      console.log(
        "AI DESIGN REFERENCE:"
      );

      if (referenceImage) {
        console.log(
          `${referenceImage.name} (${referenceImage.type}, ${referenceImage.size} bytes)`
        );
      } else {
        console.log(
          "PREVIOUS GENERATED IMAGE URL"
        );
        console.log(previousImageUrl);
      }
      console.log(
        "AI DESIGN MODEL: qwen-edit"
      );
      console.log(
        "AI DESIGN TEXT RENDERING: DISABLED"
      );
      console.log(
        "================================="
      );

      const editResponse =
        await magicHourRequest(
          "/v1/ai-image-editor",
          {
            method: "POST",
            body: JSON.stringify({
              name: "DNA AI Design Edit",

              model: "qwen-edit",

              image_count: 1,

              aspect_ratio:
                size === "Landscape" ||
                size ===
                  "YouTube Thumbnail"
                  ? "16:9"
                  : "auto",

              resolution: "640px",

              assets: {
                image_file_paths: [
                  filePath,
                ],
              },

              style: {
                prompt: editPrompt,
              },
            }),
          }
        );

      const editData =
        await editResponse
          .json()
          .catch(() => ({}));

      if (!editResponse.ok) {
        console.error(
          "Magic Hour Image Editor Error:",
          editData
        );

        return NextResponse.json(
          {
            success: false,
            error:
              editData?.message ||
              editData?.error?.message ||
              "Magic Hour gagal mengedit gambar.",
          },
          {
            status:
              editResponse.status,
          }
        );
      }

      if (!editData?.id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Magic Hour tidak mengembalikan project ID.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        projectId: editData.id,
        creditsCharged:
          editData?.credits_charged ?? 0,
        mode: "edit",
      });
    }

    // ==========================================
    // 5. GENERATION MODE
    // ==========================================
    //
    // No reference image means create a new visual.
    // The free visual-only generation remains intact.
    // ==========================================

    const finalPrompt =
      buildGenerationPrompt(prompt);

    const selectedStyle =
      style !== "Auto"
        ? style
        : "professional photorealistic commercial visual";

    const selectedColor =
      color !== "Auto"
        ? color
        : "natural coherent colors";

    const selectedTemplate =
      template !== "Auto"
        ? template
        : "clean balanced composition";

    const generationPrompt = `
${finalPrompt}

Additional user-selected settings:
Design type: ${designType}
Style: ${selectedStyle}
Template: ${selectedTemplate}
Color direction: ${selectedColor}
Size: ${size}

These settings must support the user's request and must not
replace the user's requested main subject.
`;

    console.log(
      "================================="
    );
    console.log(
      "AI DESIGN MODE: NEW VISUAL"
    );
    console.log(
      "AI DESIGN USER PROMPT:"
    );
    console.log(prompt);
    console.log(
      "AI DESIGN TEXT RENDERING: DISABLED"
    );
    console.log(
      "AI DESIGN MODEL: flux-schnell"
    );
    console.log(
      "================================="
    );

    const generationResponse =
      await magicHourRequest(
        "/v1/ai-image-generator",
        {
          method: "POST",
          body: JSON.stringify({
            name: "DNA AI Design",

            model: "flux-schnell",

            image_count: 1,

            aspect_ratio:
              size === "Landscape" ||
              size ===
                "YouTube Thumbnail"
                ? "16:9"
                : "9:16",

            resolution: "640px",

            style: {
              prompt:
                generationPrompt,
              tool: "general",
            },
          }),
        }
      );

    const generationData =
      await generationResponse
        .json()
        .catch(() => ({}));

    if (!generationResponse.ok) {
      console.error(
        "Magic Hour Image Generator Error:",
        generationData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            generationData?.message ||
            generationData?.error?.message ||
            "Magic Hour gagal membuat desain.",
        },
        {
          status:
            generationResponse.status,
        }
      );
    }

    if (!generationData?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Magic Hour tidak mengembalikan project ID.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      projectId: generationData.id,
      creditsCharged:
        generationData?.credits_charged ??
        0,
      mode: "generate",
    });
  } catch (error) {
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
      { status: 500 }
    );
  }
}