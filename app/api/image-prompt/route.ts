import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

import { askImagePrompt } from "@/lib/gemini-image";
import prisma from "@/lib/prisma";


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


   const image = formData.get("image");
const prompt = (formData.get("prompt") as string) || "";

if (!(image instanceof File) || image.size === 0) {
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


    const mimeType = image.type || "application/octet-stream";


    const result = await askImagePrompt({
      prompt,

      image: {
        mimeType,
        data: base64,
      },
    });


    const history = await prisma.history.create({
  data: {
    userId: session.user.id,
    title: "Image Prompt",
    feature: "Image Prompt",
    prompt,
    result,
  },
});

    


    return NextResponse.json({
      result,
      history,
    });


  } catch (error) {
  console.error("IMAGE PROMPT ERROR:", error);

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate prompt",
    },
    {
      status: 500,
    }
  );
}
}