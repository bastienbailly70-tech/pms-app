import type { NextAuthConfig } from "next-auth";

const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/signup",
  "/api/",
  "/invitations",
  "/uploads",
];

export const authConfig = {
  pages: { signIn: "/auth/signin" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
      if (isPublic) return true;

      if (!auth?.user) {
        const url = new URL("/auth/signin", request.url);
        url.searchParams.set("callbackUrl", pathname);
        return Response.redirect(url);
      }
      return true;
    },
  },
  providers: [], // Providers déclarés uniquement dans auth.ts (Node.js)
} satisfies NextAuthConfig;
