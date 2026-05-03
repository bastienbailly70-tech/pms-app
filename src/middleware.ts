import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Utilise uniquement la config Edge-safe — sans Prisma ni bcrypt
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
