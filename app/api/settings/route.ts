import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        theme: true,
        notifications: true,
        animations: true,
        autoSave: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: user,
    });
  } catch (error: any) {
    console.error("GET SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const theme =
      body.theme === "light" ||
      body.theme === "dark" ||
      body.theme === "system"
        ? body.theme
        : "system";

    const notifications =
      typeof body.notifications === "boolean"
        ? body.notifications
        : true;

    const animations =
      typeof body.animations === "boolean"
        ? body.animations
        : true;

    const autoSave =
      typeof body.autoSave === "boolean"
        ? body.autoSave
        : true;

    const settings = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        theme,
        notifications,
        animations,
        autoSave,
      },
      select: {
        theme: true,
        notifications: true,
        animations: true,
        autoSave: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("UPDATE SETTINGS ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to save settings",
      },
      { status: 500 }
    );
  }
}