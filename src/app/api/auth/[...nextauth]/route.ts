// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// Centralized Plan Definitions
export const APP_PLANS = {
  FREE: { name: 'Free', tier: 'free' as const, priceId: null },
  BASIC: { name: 'Basic', tier: 'basic' as const, priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID },
  PRO: { name: 'Pro', tier: 'pro' as const, priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];

const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

if (IS_DATABASE_MODE_ACTIVE) {
  console.log("[NextAuth] CONFIG: Running in DATABASE Mode.");
} else {
  console.warn("[NextAuth] CONFIG: Running in NO DATABASE Mode. Auth will use demoUsers.");
}

// In-memory store for "no DB" demo
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; simulatedTier?: AppPlanTier }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User (Free)", email: "user@example.com", passwordPlainText: "password", username: "demouser", simulatedTier: 'free' },
  "basic@example.com": { id: "demobasic-1", name: "Demo User (Basic)", email: "basic@example.com", passwordPlainText: "password", username: "basicuser", simulatedTier: 'basic' },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User (Pro)", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin", simulatedTier: 'pro' },
};


export const authOptions: AuthOptions = {
  adapter: IS_DATABASE_MODE_ACTIVE ? PrismaAdapter(prisma) : undefined,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: { /* ... */ },
      async authorize(credentials) {
        if (IS_DATABASE_MODE_ACTIVE) {
          if (!credentials?.email || !credentials?.password) throw new Error("Missing credentials");
          const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
          if (!user || !user.passwordHash) throw new Error("Invalid credentials");
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) throw new Error("Invalid credentials");
          return { id: user.id, name: user.name, email: user.email, image: user.image };
        } else { // NO DB MODE
          if (!credentials?.email || !credentials?.password) return null;
          const userFromDemo = demoUsers[credentials.email.toLowerCase()];
          if (userFromDemo && userFromDemo.passwordPlainText === credentials.password) {
            return { id: userFromDemo.id, name: userFromDemo.name, email: userFromDemo.email };
          }
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (!IS_DATABASE_MODE_ACTIVE && user.email) {
            const demoUser = demoUsers[user.email.toLowerCase()];
            if (demoUser?.simulatedTier) token.simulatedTier = demoUser.simulatedTier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        let currentPlanDetails = APP_PLANS.FREE; // Default to Free

        if (IS_DATABASE_MODE_ACTIVE) {
            try {
                const userFromDb = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { 
                        stripeSubscriptionId: true, 
                        stripeCurrentPeriodEnd: true,
                        stripePriceId: true,
                        stripeCustomerId: true,
                    }
                });
                if (userFromDb) {
                    (session.user as any).stripeCustomerId = userFromDb.stripeCustomerId;
                    const isActivePaid = !!userFromDb.stripeSubscriptionId && 
                                     !!userFromDb.stripeCurrentPeriodEnd && 
                                     new Date(userFromDb.stripeCurrentPeriodEnd) > new Date();
                    if (isActivePaid && userFromDb.stripePriceId) {
                        const matchedPlan = Object.values(APP_PLANS).find(p => p.priceId === userFromDb.stripePriceId);
                        if (matchedPlan) currentPlanDetails = matchedPlan;
                        else currentPlanDetails = { name: 'Subscribed (Custom)', tier: 'custom_paid', priceId: userFromDb.stripePriceId } as any;
                    }
                }
            } catch (e) { console.error("SessionCb Error fetching Stripe data:", e); }
        } else if (token.simulatedTier) { // "No DB" mode with simulated tier
            const matchedPlan = Object.values(APP_PLANS).find(p => p.tier === token.simulatedTier);
            if (matchedPlan) currentPlanDetails = matchedPlan;
        }
        (session.user as any).activePlanName = currentPlanDetails.name;
        (session.user as any).activePlanTier = currentPlanDetails.tier;
        (session.user as any).hasActivePaidSubscription = currentPlanDetails.tier !== 'free';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };