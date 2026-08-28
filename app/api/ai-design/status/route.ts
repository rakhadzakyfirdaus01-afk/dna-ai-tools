import { NextRequest, NextResponse } from "next/server";

const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!MAGIC_HOUR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "MAGIC_HOUR_API_KEY belum dikonfigurasi.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("id");

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.magichour.ai/v1/image-projects/${encodeURIComponent(
        projectId
      )}`,
      {
        method: "GET",

        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
        },

        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Magic Hour Status Error:",
        data
      );

      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error?.message ||
            "Gagal mengambil status desain.",
        },
        {
          status: response.status,
        }
      );
    }

    // =====================================================
    // CARI URL HASIL GAMBAR
    // =====================================================

    let imageUrl: string | null = null;

    if (Array.isArray(data?.downloads)) {
      const firstDownload = data.downloads[0];

      if (typeof firstDownload === "string") {
        imageUrl = firstDownload;
      } else if (
        firstDownload &&
        typeof firstDownload.url === "string"
      ) {
        imageUrl = firstDownload.url;
      }
    }

    // Beberapa response API dapat menggunakan output
    // sebagai lokasi hasil gambar.
    if (!imageUrl && Array.isArray(data?.outputs)) {
      const firstOutput = data.outputs[0];

      if (typeof firstOutput === "string") {
        imageUrl = firstOutput;
      } else if (
        firstOutput &&
        typeof firstOutput.url === "string"
      ) {
        imageUrl = firstOutput.url;
      }
    }

    // =====================================================
    // STATUS
    // =====================================================

    const status =
      typeof data?.status === "string"
        ? data.status.toLowerCase()
        : "";

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,
      id: data?.id || projectId,
      status,
      imageUrl,
      error: data?.error || null,
    });
  } catch (error) {
    console.error(
      "AI DESIGN STATUS SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengambil hasil desain.",
      },
      {
        status: 500,
      }
    );
  }
}