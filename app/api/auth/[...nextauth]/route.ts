import NextAuth from "next-auth";
import { authOptions, lastErrorDetails } from "@/auth";
import { NextRequest } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

async function handler(req: NextRequest, ctx: any) {
  const res: Response = await nextAuthHandler(req, ctx);
  const location = res.headers.get("Location");
  if (location && location.includes("error=")) {
    try {
      const parsed = new URL(location, req.nextUrl.origin);
      const errorType = parsed.searchParams.get("error") || "OAuthCallback";
      const details =
        lastErrorDetails ||
        parsed.searchParams.get("details") ||
        req.nextUrl.searchParams.get("details") ||
        "";

      const targetUrl = new URL("/login", req.nextUrl.origin);
      targetUrl.searchParams.set("error", errorType);
      if (details) {
        targetUrl.searchParams.set("details", details);
      }

      const newHeaders = new Headers(res.headers);
      newHeaders.set("Location", targetUrl.toString());
      if (details) {
        newHeaders.append(
          "Set-Cookie",
          `auth_error_debug=${encodeURIComponent(details)}; Path=/; Max-Age=120`
        );
      }

      return new Response(null, {
        status: 302,
        headers: newHeaders,
      });
    } catch (e) {
      console.error("[Route Redirect Catch]", e);
    }
  }
  return res;
}

export { 
  handler as GET,
  handler as POST,
};