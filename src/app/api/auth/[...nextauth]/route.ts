// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google"; // DEFER for MVP if desired
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// MVP: Simplified Plan (everyone is on a single free tier)
export const APP_PLANS = {
  MVP_FREE: { name: 'MVP Access', tier: 'mvp_free' as const, priceId: null },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];

const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

// Demo users for NO DB mode (if DATABASE_URL is not set)
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User", email: "user@example.com", passwordPlainText: "password", username: "demouser" },
  // Add more demo users if needed for no-DB testing
};

if (IS_DATABASE_MODE_ACTIVE) {
  console.log("[NextAuth] CONFIG: Running in DATABASE Mode for MVP.");
} else {
  console.warn("[NextAuth] CONFIG: Running in NO DATABASE Mode for MVP. Auth will use demoUsers.");
}

export const authOptions: AuthOptions = {
  adapter: IS_DATABASE_MODE_ACTIVE ? PrismaAdapter(prisma) : undefined,
  providers: [
    // GoogleProvider({ // DEFER for MVP if desired, uncomment to keep
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!IS_DATABASE_MODE_ACTIVE) { // NO DB MODE
          if (!credentials?.email || !credentials?.password) return null;
          const userFromDemo = demoUsers[credentials.email.toLowerCase()];
          if (userFromDemo && userFromDemo.passwordPlainText === credentials.password) {
            return { id: userFromDemo.id, name: userFromDemo.name, email: userFromDemo.email };
          }
          return null;
        }
        // DB MODE
        if (!prisma) throw new Error("Database service not available for authorization."); // Should not happen if IS_DATABASE_MODE_ACTIVE is true
        if (!credentials?.email || !credentials?.password) throw new Error("Missing credentials");
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.passwordHash) throw new Error("Invalid credentials (user or hash missing)");
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) throw new Error("Invalid credentials (password mismatch)");
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // No tier or favorite logic needed for MVP JWT
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        // MVP: All users are on the single free tier
        (session.user as any).activePlanName = APP_PLANS.MVP_FREE.name;
        (session.user as any).activePlanTier = APP_PLANS.MVP_FREE.tier;
        (session.user as any).hasActivePaidSubscription = false; // No paid plans in MVP
        // (session.user as any).favoriteIndicatorIds = []; // Favorites deferred for MVP
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };