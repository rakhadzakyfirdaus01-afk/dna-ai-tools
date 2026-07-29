import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";




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





    const fileName =
      `${Date.now()}-${image.name}`;





    const fs = require("fs");

    const path = require("path");





    const uploadPath = path.join(
      process.cwd(),
      "public/uploads"
    );





    if (!fs.existsSync(uploadPath)) {


      fs.mkdirSync(uploadPath, {
        recursive: true,
      });


    }





    fs.writeFileSync(
      path.join(uploadPath, fileName),
      buffer
    );






    const imageUrl = `/uploads/${fileName}`;






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