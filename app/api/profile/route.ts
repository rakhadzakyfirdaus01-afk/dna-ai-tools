import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import cloudinary from "@/lib/cloudinary";

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

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        image: true,
      },
    });

    return NextResponse.json({
      image: user?.image ?? null,
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return NextResponse.json(
      {
        message: "Failed to load profile",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
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

    const formData = await request.formData();

    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          message: "Image required",
        },
        {
          status: 400,
        }
      );
    }

    if (image.size === 0) {
      return NextResponse.json(
        {
          message: "Image is empty",
        },
        {
          status: 400,
        }
      );
    }

    const bytes = await image.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "dna-ai-tools/profile",
            },
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(result);
            }
          )
          .end(buffer);
      }
    );

    const imageUrl = uploadResult.secure_url;

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        image: imageUrl,
      },
    });

    return NextResponse.json({
      message: "Profile image updated",
      image: imageUrl,
    });
  } catch (error) {
    console.error("PROFILE UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        message: "Profile image upload failed",
      },
      {
        status: 500,
      }
    );
  }
}