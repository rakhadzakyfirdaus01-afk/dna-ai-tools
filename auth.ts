import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyUserCredentials } from "@/lib/user-store";

// Kunci rahasia global yang seragam untuk serverless dan client
const NEXTAUTH_SECRET = "dna-ai-tools-super-secret-jwt-key-2026-production";
process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost"))
) {
  process.env.NEXTAUTH_URL = "https://dna-ai-tools-one.vercel.app";
}

export let lastErrorDetails = "";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        username: {
          label: "Nama Pengguna",
          type: "text",
        },
        pin: {
          label: "PIN",
          type: "password",
        },
      },

      async authorize(credentials, req) {
        const username =
          (credentials?.username as string) ||
          ((credentials as any)?.email as string);
        const pin =
          (credentials?.pin as string) ||
          ((credentials as any)?.password as string);

        if (!username || !pin) {
          return null;
        }

        const cookieHeader = req?.headers?.cookie || "";
        let vaultData: string | null = null;
        const match = cookieHeader.match(/dna_vault=([^;]+)/);
        if (match) {
          vaultData = match[1];
        }

        const user = await verifyUserCredentials({
          username,
          pin,
          vaultData,
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
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

  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15,
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15,
      },
    },
  },

  logger: {
    error(code, metadata: any) {
      console.error("[NextAuth ERROR]", code, metadata);
      try {
        const innerErr = metadata?.error || metadata;
        const msg =
          innerErr?.message ||
          innerErr?.error_description ||
          innerErr?.error ||
          (typeof innerErr === "string" ? innerErr : JSON.stringify(innerErr));
        lastErrorDetails = `${code}: ${msg}`;
      } catch {
        lastErrorDetails = String(code);
      }
    },
    warn(code) {
      console.warn("[NextAuth WARN]", code);
    },
    debug(code, metadata) {
      console.log("[NextAuth DEBUG]", code, metadata);
    },
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