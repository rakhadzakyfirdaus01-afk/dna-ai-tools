import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";


export async function GET() {
  try {
    const session = await getServerSession(authOptions);


    if (!session?.user?.email) {
      return NextResponse.json(
        {
          message: "Unauthorized",
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
          message: "User not found",
        },
        {
          status: 404,
        }
      );
    }


    const history = await prisma.history.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: "desc",
      },
    });


    return NextResponse.json({
      history,
    });


  } catch (error: any) {

    console.error(error);


    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Failed to get history",
      },
      {
        status: 500,
      }
    );
  }
}