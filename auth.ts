import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";

if (
  isProduction &&
  (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))
) {
  process.env.NEXTAUTH_URL = "https://dna-ai-tools-one.vercel.app";
}

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET !== "ISI_NILAI_ASLI"
    ? process.env.NEXTAUTH_SECRET
    : "dna-ai-tools-super-secret-jwt-key-2026-production";

// Hanya gunakan DB jika DATABASE_URL adalah database cloud yang valid (bukan localhost)
const canUseDb = Boolean(
  process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("localhost") &&
    !process.env.DATABASE_URL.includes("127.0.0.1")
);

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
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
        } catch {
          return null;
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },

  pages: {
    signIn: "/login",
  },

  secret: NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        // Jika ada database remote aktif, sinkronkan profil user
        if (canUseDb) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email },
            });

            if (!existingUser) {
              await prisma.user.create({
                data: {
                  name: user.name || "User",
                  email: user.email,
                  image: user.image || null,
                  password: "",
                },
              });
            } else if (!existingUser.image && user.image) {
              await prisma.user.update({
                where: { email: user.email },
                data: { image: user.image },
              });
            }
          } catch (error) {
            console.warn("DB user sync skipped:", error);
          }
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // Saat pertama kali login
      if (user) {
        token.id = user.id || (token.sub as string) || "user-id";
        token.name = user.name || "User";
        token.email = user.email || "";
        token.image = user.image || null;

        if (account?.provider === "google" && user.email && canUseDb) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.name = dbUser.name;
              token.email = dbUser.email;
              token.image = dbUser.image;
            }
          } catch (e) {
            console.warn("DB user fetch in jwt skipped:", e);
          }
        }
      }

      // Saat session di-update dari client
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      if (trigger === "update" && session?.image) {
        token.image = session.image;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "";
        session.user.name = (token.name as string) || "User";
        session.user.email = (token.email as string) || "";
        session.user.image = (token.image as string) || null;
      }

      return session;
    },
  },
};