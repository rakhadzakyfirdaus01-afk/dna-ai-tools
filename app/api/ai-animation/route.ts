import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

import { generateAnimation } from "@/lib/gemini-animation";


export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);


    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }


    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });


    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );
    }


    const body = await req.json();

    const prompt = body.prompt ?? "";


    if (!prompt) {
      return NextResponse.json(
        {
          error: "Prompt is required",
        },
        {
          status: 400,
        }
      );
    }


    const result = await generateAnimation(prompt);


    await prisma.history.create({
      data: {
        userId: user.id,
        title: "AI Animation",
        feature: "AI Animation",
        prompt,
        result:
          typeof result === "string"
            ? result
            : JSON.stringify(result),
      },
    });


    return NextResponse.json({
      success: true,
      result,
    });


  } catch (error: any) {

    console.error(error);


    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Failed to generate animation",
      },
      {
        status: 500,
      }
    );
  }
}