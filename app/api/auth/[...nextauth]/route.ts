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
      if (lastErrorDetails) {
        parsed.searchParams.set("details", lastErrorDetails);
      }
      const newHeaders = new Headers(res.headers);
      newHeaders.set("Location", parsed.toString());
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: newHeaders,
      });
    } catch {}
  }
  return res;
}

export { 
  handler as GET,
  handler as POST,
};