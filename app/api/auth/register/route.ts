import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";


export async function POST(request: Request) {

  try {

    const body = await request.json();


    const {
      name,
      email,
      password,
    } = body;



    if (
      !name ||
      !email ||
      !password
    ) {

      return NextResponse.json(
        {
          message: "Semua field wajib diisi.",
        },
        {
          status: 400,
        }
      );

    }




    const existingUser =
      await prisma.user.findUnique({

        where: {
          email,
        },

      });



    if (existingUser) {

      return NextResponse.json(
        {
          message: "Email sudah digunakan.",
        },
        {
          status: 400,
        }
      );

    }





    const hashedPassword =
      await bcrypt.hash(password, 10);





    const user =
      await prisma.user.create({

        data: {

          name,

          email,

          password: hashedPassword,

          

        },

      });







    return NextResponse.json(

      {

        message: "Register berhasil.",

        user,

      },

      {

        status: 201,

      }

    );




  } catch (error) {


    console.error(error);



    return NextResponse.json(

      {

        message: "Terjadi kesalahan server.",

      },

      {

        status: 500,

      }

    );


  }

}