import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";



export const authOptions: NextAuthOptions = {


  providers: [


    CredentialsProvider({


      name: "Credentials",


      credentials: {


        email: {
          label: "Email",
          type: "text",
        },


        password: {
          label: "Password",
          type: "password",
        },


      },



      async authorize(credentials) {



        if (
          !credentials?.email ||
          !credentials?.password
        ) {

          return null;

        }




        const user = await prisma.user.findUnique({


          where: {


            email: credentials.email,


          },


        });





        if (!user) {


          return null;


        }





        const passwordValid = await bcrypt.compare(


          credentials.password,


          user.password


        );





        if (!passwordValid) {


          return null;


        }





        return {


          id: user.id,


          name: user.name,


          email: user.email,


          image: user.image,


        };


      },


    }),


  ],






  session: {


    strategy: "jwt",


  },





  pages: {


    signIn: "/login",


  },





  secret: process.env.NEXTAUTH_SECRET,





  callbacks: {



    async jwt({ token, user }) {



      if (user) {


        token.id = user.id;


        token.image = user.image;


      }



      return token;


    },






    async session({ session, token }) {



      if (session.user) {


        session.user.id = token.id as string;


        session.user.image = token.image as string;


      }




      return session;


    },



  },



};