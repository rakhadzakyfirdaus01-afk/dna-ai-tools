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
        name: true,
      },
    });

    return NextResponse.json({
      image: user?.image ?? null,
      name: user?.name ?? null,
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
  } catch (error: any) {
    console.error("PROFILE UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        message:
          error?.message ?? "Profile image upload failed",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    console.log("=================================");
    console.log("PATCH /api/profile DIPANGGIL");

    const session = await getServerSession(authOptions);

    console.log("SESSION USER ID:", session?.user?.id);

    if (!session?.user?.id) {
      console.log("SESSION TIDAK ADA");

      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    console.log("BODY:", body);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    console.log("NAME:", name);

    if (!name) {
      return NextResponse.json(
        {
          message: "Nama wajib diisi",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        {
          message: "Nama maksimal 50 karakter",
        },
        {
          status: 400,
        }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        name: name,
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log("USER BERHASIL DIUPDATE:", updatedUser);

    return NextResponse.json({
      message: "Nama berhasil diperbarui",
      name: updatedUser.name,
    });
  } catch (error: any) {
    console.error("UPDATE PROFILE NAME ERROR:", error);

    return NextResponse.json(
      {
        message:
          error?.message ?? "Gagal memperbarui nama",
      },
      {
        status: 500,
      }
    );
  }
}