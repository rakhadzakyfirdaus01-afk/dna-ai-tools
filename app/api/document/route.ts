import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { askDocument } from "@/lib/gemini-document";

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

    const document = formData.get("document") as File | null;
    const prompt = (formData.get("prompt") as string) || "";

    if (!document) {
      return NextResponse.json(
        {
          error: "Document is required",
        },
        {
          status: 400,
        }
      );
    }

    const bytes = await document.arrayBuffer();

    const base64 = Buffer.from(bytes).toString("base64");

    const mimeType = document.type;

    const result = await askDocument({
      prompt,
      document: {
        mimeType,
        data: base64,
      },
    });

    const history = await prisma.history.create({
      data: {
        userId: session.user.id,
        title: "AI Document",
        feature: "AI Document",
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
        error: error.message ?? "Failed to analyze document",
      },
      {
        status: 500,
      }
    );
  }
}