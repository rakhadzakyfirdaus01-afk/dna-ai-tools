import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";


export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
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


    const { id } = await params;


    const history = await prisma.history.findUnique({
      where: {
        id,
      },
    });


    if (!history) {
      return NextResponse.json(
        {
          error: "History not found",
        },
        {
          status: 404,
        }
      );
    }


    if (history.userId !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }


    await prisma.history.delete({
      where: {
        id,
      },
    });


    return NextResponse.json({
      success: true,
      message: "History deleted",
    });


  } catch (error: any) {

    console.error(error);


    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ??
          "Failed to delete history",
      },
      {
        status: 500,
      }
    );
  }
}