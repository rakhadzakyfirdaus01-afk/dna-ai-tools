import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function GET() {
  return NextResponse.json({
    message: "Upload API siap digunakan",
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("image") as File;

    const bytes = await file.arrayBuffer();

const buffer = Buffer.from(bytes);

const uploadResult = await new Promise<any>((resolve, reject) => {
  cloudinary.uploader
    .upload_stream(
      {
        folder: "dna-ai-tools/profile",
      },
      (error, result) => {
        if (error) return reject(error);

        resolve(result);
      }
    )
    .end(buffer);
});

    if (!file) {
      return NextResponse.json(
        { message: "File tidak ditemukan" },
        { status: 400 }
      );
    }

    return NextResponse.json({
  image: uploadResult.secure_url,
});
  } catch (error) {
    return NextResponse.json(
      {
        message: "Upload gagal",
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}