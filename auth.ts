import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";

export const config = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 이메일 인증 확인 (선택적)
      if (!user.email) {
        return false;
      }

      // 조직이 없는 사용자의 경우 기본 조직 생성 또는 할당
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: { organization: true },
      });

      if (!existingUser) {
        // 신규 사용자: 개인 조직 자동 생성
        const slug = user.email?.split("@")[0] || `user-${Date.now()}`;
        await prisma.organization.create({
          data: {
            name: `${user.name || user.email}'s Organization`,
            slug: slug,
            users: {
              create: {
                email: user.email!,
                name: user.name,
                image: user.image,
                role: "admin",
                emailVerified: new Date(),
              },
            },
          },
        });
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        // 사용자 정보 확장
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { organization: true },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.role = dbUser.role;
          session.user.organizationId = dbUser.organizationId;
          session.user.organizationSlug = dbUser.organization.slug;
        }

        // 마지막 로그인 시간 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { lastSignInAt: new Date() },
        });
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
