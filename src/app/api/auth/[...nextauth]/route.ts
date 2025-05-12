// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
// import GoogleProvider from "next-auth/providers/google"; // Temporarily comment for isolation
import CredentialsProvider from "next-auth/providers/credentials";

// Ensure NO Prisma imports here if you want to avoid DB for credentials
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import prisma from "@/lib/prisma";

const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string }> = {
  "user@example.com": { id: "1", name: "Demo User", email: "user@example.com", passwordPlainText: "password", username: "demouser" },
  "admin@example.com": { id: "2", name: "Admin User", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin" },
};

export const authOptions: AuthOptions = {
  // adapter: PrismaAdapter(prisma), // MUST BE COMMENTED OUT
  providers: [
    // GoogleProvider({ // Temporarily comment out to isolate credentials
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        console.log("[NO DB AUTH] Authorize called. Credentials:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.error("[NO DB AUTH] Missing email or password.");
          return null;
        }
        const userFromDemoStore = demoUsers[credentials.email.toLowerCase()];
        if (userFromDemoStore && userFromDemoStore.passwordPlainText === credentials.password) {
          console.log("[NO DB AUTH] Demo user found and password matches:", userFromDemoStore.email);
          return { id: userFromDemoStore.id, name: userFromDemoStore.name, email: userFromDemoStore.email };
        }
        console.warn("[NO DB AUTH] Demo user not found or password mismatch:", credentials.email);
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) (session.user as any).id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: true, // Consider enabling for more NextAuth logs
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };