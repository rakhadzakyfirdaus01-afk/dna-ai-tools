import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { askDebugger } from "@/lib/gemini-debugger";


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


    const { code } = body;


    if (!code) {
      return NextResponse.json(
        {
          error: "Code is required",
        },
        {
          status: 400,
        }
      );
    }


    // Jalankan AI Debugger
    const result = await askDebugger(code);



    // Simpan ke history
    const history = await prisma.history.create({

      data: {

        userId: session.user.id,

        title: "AI Debugger",

        feature: "AI Debugger",

        prompt: code,

        result: result,

      },

    });



    console.log(
      "DEBUGGER HISTORY SAVED:",
      history.id
    );



    return NextResponse.json({

      success: true,

      result,

      history,

    });



  } catch (error) {


    console.error(
      "DEBUGGER ERROR:",
      error
    );


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