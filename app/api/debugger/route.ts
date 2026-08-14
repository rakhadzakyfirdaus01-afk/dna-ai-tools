import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { askDebugger } from "@/lib/gemini-debugger";
import type { Locale } from "@/components/shared/language-provider";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    const locale: Locale =
      body.locale === "en" ? "en" : "id";

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const result = await askDebugger(code, locale);

    await prisma.history.create({
      data: {
        userId: session.user.id,
        title: "AI Tech Assistant",
        feature: "AI Tech Assistant",
        prompt: code,
        result,
      },
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("DEBUGGER ERROR:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}