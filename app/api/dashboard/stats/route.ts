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
   
   const history = await prisma.history.findMany({
  where: {
    userId: session.user.id,
  },
});

    const totalRequests = history.length;

    const debugSessions = history.filter(
  (item) => item.feature.includes("AI Tech Assistant")
).length;

    const generatedImages = history.filter(
      (item) => item.feature.includes("Image")
    ).length;

    const aiDesigns = history.filter(
      (item) => item.feature.includes("Design")
    ).length;

    const aiAnimations = history.filter(
      (item) => item.feature.includes("Animation")
    ).length;

    const aiDocuments = history.filter(
      (item) => item.feature.includes("Document")
    ).length;

    const aiOCR = history.filter(
      (item) => item.feature.includes("OCR")
    ).length;

    const aiTranslator = history.filter(
      (item) => item.feature.includes("Translator")
    ).length;

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