import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentialsSignIn } from "@/lib/auth/authorize-credentials";
import { demoUser } from "@/lib/data/mock-cadence";

export const { auth, handlers, signIn, signOut } = NextAuth({
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

        const isDemoSessionUser =
          session.user.id === demoUser.id || session.user.email === demoUser.email;

        if (isDemoSessionUser) {
          session.user.name = demoUser.name;
          session.user.email = demoUser.email;
        }
      }

      return session;
    },
  },
});