import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

      const day = date.getDay();

      const index = day === 0 ? 6 : day - 1;

      usage[index].value++;
    });

    return NextResponse.json(usage);
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