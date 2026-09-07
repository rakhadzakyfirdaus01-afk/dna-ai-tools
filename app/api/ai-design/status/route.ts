import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

const MAGIC_HOUR_API_KEY =
  process.env.MAGIC_HOUR_API_KEY;

export async function GET(request: NextRequest) {
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
    // 2. CEK USER LOGIN
    // ==========================================

    const session =
      await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    // ==========================================
    // 3. AMBIL PARAMETER
    // ==========================================

    const { searchParams } =
      new URL(request.url);

    const projectId =
      searchParams.get("id");

    const prompt =
      searchParams.get("prompt")?.trim() || "";

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Project ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. AMBIL STATUS DARI MAGIC HOUR
    // ==========================================

    const response = await fetch(
      `https://api.magichour.ai/v1/image-projects/${encodeURIComponent(
        projectId
      )}`,
      {
        method: "GET",

        headers: {
          Accept: "application/json",
          Authorization:
            `Bearer ${MAGIC_HOUR_API_KEY}`,
        },

        cache: "no-store",
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

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

    // ==========================================
    // 5. CARI URL HASIL GAMBAR
    // ==========================================

    let imageUrl: string | null = null;

    if (
      Array.isArray(data?.downloads)
    ) {
      const firstDownload =
        data.downloads[0];

      if (
        typeof firstDownload ===
        "string"
      ) {
        imageUrl = firstDownload;
      } else if (
        firstDownload &&
        typeof firstDownload.url ===
          "string"
      ) {
        imageUrl =
          firstDownload.url;
      }
    }

    if (
      !imageUrl &&
      Array.isArray(data?.outputs)
    ) {
      const firstOutput =
        data.outputs[0];

      if (
        typeof firstOutput ===
        "string"
      ) {
        imageUrl = firstOutput;
      } else if (
        firstOutput &&
        typeof firstOutput.url ===
          "string"
      ) {
        imageUrl =
          firstOutput.url;
      }
    }

    // ==========================================
    // 6. STATUS
    // ==========================================

    const status =
      typeof data?.status ===
      "string"
        ? data.status.toLowerCase()
        : "";

    // ==========================================
    // 7. SIMPAN AI DESIGN KE HISTORY
    // ==========================================
    //
    // Hanya ketika render sudah selesai.
    //
    // Dedup:
    // polling frontend akan memanggil endpoint
    // berkali-kali, sehingga kita tidak boleh membuat
    // history berkali-kali untuk gambar yang sama.
    //
    // Prompt dikirim oleh frontend sebagai query param.
    // ==========================================

    let history = null;

    const isCompleted =
      status === "complete" ||
      status === "completed" ||
      status === "succeeded";

    if (
      isCompleted &&
      imageUrl &&
      prompt
    ) {
      try {
        const existingHistory =
          await prisma.history.findFirst({
            where: {
              userId: user.id,
              feature: "AI Design",
              result: imageUrl,
            },
            select: {
              id: true,
            },
          });

        if (!existingHistory) {
          history =
            await prisma.history.create({
              data: {
                userId: user.id,
                title: "AI Design",
                feature: "AI Design",
                prompt,
                result: imageUrl,
              },
            });

          console.log(
            "AI Design history saved:",
            history.id
          );
        }
      } catch (
        historyError
      ) {
        // History failure should not make
        // an already completed image fail.
        console.warn(
          "Gagal menyimpan history AI Design:",
          historyError
        );
      }
    }

    // ==========================================
    // 8. RESPONSE
    // ==========================================

    return NextResponse.json({
      success: true,
      id:
        data?.id ||
        projectId,
      status,
      imageUrl,
      error:
        data?.error || null,

      // Indicates whether this polling request
      // created a history record.
      historySaved:
        Boolean(history),

      historyId:
        history?.id || null,
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