import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db, hasDatabaseUrl } from "@/lib/db";
import { authorizeCredentialsSignIn } from "@/lib/auth/authorize-credentials";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: hasDatabaseUrl && db ? PrismaAdapter(db) : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        return authorizeCredentialsSignIn(rawCredentials, request);
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id ?? (token.id as string | undefined) ?? session.user.id;
      }

      return session;
    },
  },
});