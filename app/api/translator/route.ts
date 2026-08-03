import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { askTranslator } from "@/lib/gemini-translator";

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

    const body = await req.json();

    const prompt = body.prompt ?? "";

    if (!prompt.trim()) {
      return NextResponse.json(
        {
          error: "Prompt is required",
        },
        {
          status: 400,
        }
      );
    }

    const result = await askTranslator(prompt);

    const history = await prisma.history.create({
      data: {
        userId: session.user.id,
        title: "AI Translator",
        feature: "AI Translator",
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
        error: error.message ?? "Translation failed",
      },
      {
        status: 500,
      }
    );
  }
}