import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { askOCR } from "@/lib/gemini-ocr";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const formData = await req.formData();

    const image = formData.get("image") as File | null;
    const prompt = (formData.get("prompt") as string) || "";

    if (!image) {
      return NextResponse.json(
        {
          error: "Image is required",
        },
        {
          status: 400,
        }
      );
    }

    const bytes = await image.arrayBuffer();

    const base64 = Buffer.from(bytes).toString("base64");

    const mimeType = image.type;

    const result = await askOCR({
      prompt,
      image: {
        mimeType,
        data: base64,
      },
    });

    const history = await prisma.history.create({
      data: {
        userId: session.user.id,
        title: "AI OCR",
        feature: "AI OCR",
        prompt,
        result,
      },
    });

    return NextResponse.json({
      result,
      history,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message ?? "Failed to analyze image",
      },
      {
        status: 500,
      }
    );
  }
}