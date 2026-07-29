import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

import prisma from "@/lib/prisma";
import { askDesign } from "@/lib/gemini-design";


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

    const { prompt } = body;


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


    const result = await askDesign(prompt);


    const history = await prisma.history.create({
      data: {
        userId: session.user.id,
        title: "AI Design",
        feature: "AI Design",
        prompt: prompt,
        result: result.text,
      },
    });


    console.log("AI DESIGN HISTORY SAVED:", history);


    return NextResponse.json({
      result,
      history,
    });


  } catch (error) {

    console.error("AI DESIGN ERROR:", error);


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