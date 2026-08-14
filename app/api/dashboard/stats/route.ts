import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const userId = session.user.id;

    const [
      totalRequests,
      debugSessions,
      generatedImages,
      aiDesigns,
      aiAnimations,
      aiDocuments,
      aiOCR,
      aiTranslator,
    ] = await Promise.all([
      prisma.history.count({
        where: {
          userId,
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "AI Tech Assistant",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "Image",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "Design",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "Animation",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "Document",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "OCR",
          },
        },
      }),

      prisma.history.count({
        where: {
          userId,
          feature: {
            contains: "Translator",
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalRequests,
      debugSessions,
      generatedImages,
      aiDesigns,
      aiAnimations,
      aiDocuments,
      aiOCR,
      aiTranslator,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return NextResponse.json(
      {
        message: "Failed get dashboard statistics",
      },
      {
        status: 500,
      }
    );
  }
}