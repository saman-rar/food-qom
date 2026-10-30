/**
 * NextAuth Configuration
 * Authentication with credentials provider
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validations";
import { USER_ROLES } from "@/lib/constants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "نام کاربری", type: "text" },
        password: { label: "رمز عبور", type: "password" },
        rememberMe: { label: "مرا به یاد بسپار", type: "checkbox" },
      },
      authorize: async (credentials) => {
        const validated = loginSchema.safeParse(credentials);
        
        if (!validated.success) {
          throw new Error("اطلاعات ورودی معتبر نیست");
        }

        const { username, password } = validated.data;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          throw new Error("نام کاربری یا رمز عبور اشتباه است");
        }

        if (!user.isActive) {
          throw new Error("حساب کاربری شما غیرفعال است");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          throw new Error("نام کاربری یا رمز عبور اشتباه است");
        }

        return {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.fullName = user.fullName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          username: token.username as string,
          fullName: token.fullName as string,
          role: token.role as string,
          email: token.email as string | undefined,
        };
      }
      return session;
    },
  },
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isAdmin(role: string): boolean {
  return role === USER_ROLES.ADMIN;
}

export function isUser(role: string): boolean {
  return role === USER_ROLES.USER;
}