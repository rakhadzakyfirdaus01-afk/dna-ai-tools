import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// ==========================================
// AI DESIGN STATUS — POLLINATIONS.AI (FREE)
//
// The projectId is a base64url-encoded Pollinations URL.
// We decode it and return "complete" immediately, along
// with the image URL so the frontend can display it.
//
// History is saved on the first successful completion.
// ==========================================

export async function GET(request: NextRequest) {
  try {
    // ==========================================
    // 1. CEK USER LOGIN
    // ==========================================

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    let user = null;

    try {
      if (session?.user?.email) {
        user = await prisma.user.findUnique({
          where: {
            email: session.user.email,
          },
        });
      }
    } catch (dbError) {
      console.warn("DB lookup skipped in status route:", dbError);
    }

    // ==========================================
    // 2. AMBIL PARAMETER
    // ==========================================

    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get("id");
    const prompt = searchParams.get("prompt")?.trim() || "";

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. DECODE POLLINATIONS URL
    //
    // The projectId is a base64url string that encodes
    // the full Pollinations image URL built in route.ts.
    // ==========================================

    let imageUrl: string;

    try {
      imageUrl = Buffer.from(projectId, "base64url").toString("utf8");
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      !imageUrl.startsWith("https://image.pollinations.ai/")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Project ID tidak dikenali.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. SIMPAN KE HISTORY (SEKALI SAJA)
    //
    // Dedup: jangan simpan dua kali untuk URL yang sama.
    // ==========================================

    if (prompt) {
      try {
        const existingHistory = await prisma.history.findFirst({
          where: {
            userId: user.id,
            feature: "AI Design",
            result: imageUrl,
          },
          select: { id: true },
        });

        if (!existingHistory) {
          await prisma.history.create({
            data: {
              userId: user.id,
              title: "AI Design",
              feature: "AI Design",
              prompt,
              result: imageUrl,
            },
          });
        }
      } catch (historyError) {
        // History gagal disimpan tidak boleh menggagalkan respons.
        console.warn("AI Design history save failed:", historyError);
      }
    }

    // ==========================================
    // 5. RETURN COMPLETE
    //
    // Pollinations generates images synchronously via URL.
    // We immediately return "complete" so the frontend
    // stops polling and displays the image.
    // ==========================================

    return NextResponse.json({
      success: true,
      status: "complete",
      imageUrl,
    });
  } catch (error) {
    console.error("AI DESIGN STATUS ERROR:", error);

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