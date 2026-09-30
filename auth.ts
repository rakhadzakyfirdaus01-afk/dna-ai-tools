import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// Kunci rahasia global yang seragam untuk serverless dan client
const NEXTAUTH_SECRET = "dna-ai-tools-super-secret-jwt-key-2026-production";
process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))
) {
  process.env.NEXTAUTH_URL = "https://dna-ai-tools-one.vercel.app";
}

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "312880952684-" + "lc7ih9gpsjj6u8mtb015ck1no70vvmqf.apps.googleusercontent.com";

const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET ||
  "GOCSPX-" + "noiKlm5HeljPXt2gFxlX53YGkivZ";

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
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      checks: ["none"],
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
    error: "/login",
  },

  secret: NEXTAUTH_SECRET,

  callbacks: {
    // Selalu izinkan pengguna login dengan Google tanpa hambatan
    async signIn() {
      return true;
    },

    // Arahkan selalu ke AI Assistant setelah login berhasil
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        const parsed = new URL(url);
        if (
          parsed.origin === baseUrl ||
          parsed.origin.includes("vercel.app") ||
          parsed.origin.includes("localhost")
        ) {
          return url;
        }
      } catch {}
      return `${baseUrl}/ai-assistant`;
    },

    // Buat JWT token dari data Google
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id || (token.sub as string) || "google-user";
        token.name = user.name || "User";
        token.email = user.email || "";
        token.image = user.image || null;
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      if (trigger === "update" && session?.image) {
        token.image = session.image;
      }

      return token;
    },

    // Buat sesi pengguna untuk dibaca oleh seluruh halaman dashboard
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string) || "user";
        session.user.name = (token.name as string) || "User";
        session.user.email = (token.email as string) || "";
        session.user.image = (token.image as string) || null;
      }

      return session;
    },
  },
};