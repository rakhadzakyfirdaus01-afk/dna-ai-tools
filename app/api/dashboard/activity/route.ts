import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET() {

  try {

    const activities = await prisma.history.findMany({

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