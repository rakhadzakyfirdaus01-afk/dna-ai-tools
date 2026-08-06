import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await prisma.history.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    const usage = [
      {
        day: "Mon",
        value: 0,
      },
      {
        day: "Tue",
        value: 0,
      },
      {
        day: "Wed",
        value: 0,
      },
      {
        day: "Thu",
        value: 0,
      },
      {
        day: "Fri",
        value: 0,
      },
      {
        day: "Sat",
        value: 0,
      },
      {
        day: "Sun",
        value: 0,
      },
    ];

    history.forEach((item) => {
      const date = new Date(item.createdAt);



const day = new Date(
  date.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  })
).getDay();


      const index = day === 0 ? 6 : day - 1;

      usage[index].value++;
    });
    
   console.log(
  history.map((item) => ({
    createdAt: item.createdAt,
  }))
);

    return NextResponse.json(usage, {
  headers: {
    "Cache-Control": "no-store",
  },
});
  } catch (error) {
    console.error("Usage API Error:", error);

    return NextResponse.json(
      {
        message: "Failed get usage data",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}