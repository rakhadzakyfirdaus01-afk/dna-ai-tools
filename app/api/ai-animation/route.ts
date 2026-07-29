import { NextResponse } from "next/server";



export async function POST(request: Request) {


  try {


    const formData = await request.formData();





    const file = formData.get("file") as File | null;


    const prompt = formData.get("prompt") as string | null;






    if (!file) {



      return NextResponse.json(


        {


          success: false,


          message: "File is required",


        },


        {


          status: 400,


        }


      );


    }








    return NextResponse.json(



      {


        success: true,



        message: "Animation request received",






        animation: {



          fileName: file.name,



          fileType: file.type,



          prompt,



          status: "waiting",



        },



      }



    );







  } catch (error) {



    console.error(error);






    return NextResponse.json(



      {


        success: false,



        message: "Animation generation failed",



      },



      {


        status: 500,


      }


    );



  }



}