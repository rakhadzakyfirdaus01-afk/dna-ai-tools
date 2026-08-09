import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function GET() {

  try {

    const session = await getServerSession(authOptions);

if (!session?.user?.id) {
  return NextResponse.json(
    {
      message: "Unauthorized",
    },
    {
      status: 401,
    }
  );
}

    const activities = await prisma.history.findMany({
  where: {
    userId: session.user.id,
  },

      orderBy: {
        createdAt: "desc",
      },

      take: 5,

      select: {
        title: true,
        feature: true,
        createdAt: true,
      },

    });



    return NextResponse.json(activities);


  } catch (error) {


    console.error(error);


    return NextResponse.json(
      {
        message: "Failed get activity data",
      },
      {
        status: 500,
      }
    );


  }

}