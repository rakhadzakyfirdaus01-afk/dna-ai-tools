import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";



export async function saveHistory(
  feature: string,
  prompt: string,
  result: string
) {

  const session = await getServerSession(authOptions);


  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }


  return await prisma.history.create({

    data: {

      userId: session.user.id,

      title: feature,

      feature: feature,

      prompt: prompt,

      result: result,

    },

  });

}




export async function getHistory() {

  const session = await getServerSession(authOptions);


  if (!session?.user?.id) {

    return [];

  }


  return await prisma.history.findMany({

    where: {

      userId: session.user.id,

    },


    orderBy: {

      createdAt: "desc",

    },

  });

}




export async function deleteHistory(id: string) {


  return await prisma.history.delete({

    where: {

      id,

    },

  });


}