import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import cloudinary from "@/lib/cloudinary";


export async function GET() {
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
      name: true,
      email: true,
      image: true,
    },
  });

  return NextResponse.json(user);
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



    const image = formData.get("image") as File;
     if (!image) {


      return NextResponse.json(
        {
          message: "Image required",
        },
        {
          status: 400,
        }
      );


    }

    const bytes = await image.arrayBuffer();

const buffer = Buffer.from(bytes);

const uploadResult = await new Promise<any>((resolve, reject) => {
  cloudinary.uploader
    .upload_stream(
      {
        folder: "dna-ai-tools/profile",
      },
      (error: any, result: any) => {
        if (error) return reject(error);

        resolve(result);
      }
    )
    .end(buffer);
});

const imageUrl = uploadResult.secure_url;



    await prisma.user.update({


      where: {


        id: session.user.id,


      },



      data: {


        image: imageUrl,


      },


    });


    await prisma.user.update({
  where: {
    id: session.user.id,
  },
  data: {
    image: imageUrl,
  },
});

const updatedUser = await prisma.user.findUnique({
  where: {
    id: session.user.id,
  },
});

console.log("UPDATED USER:", updatedUser);




    return NextResponse.json({

      message: "Profile image updated",

      image: imageUrl,

    });





  } catch (error) {



    console.error(error);




    return NextResponse.json(
      {
        message: "Upload failed",
      },
      {
        status: 500,
      }
    );



  }



}