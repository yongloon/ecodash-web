// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma"; // Assuming DB mode for favorites & subscriptions
import bcrypt from "bcrypt";

export const APP_PLANS = {
  FREE: { name: 'Free', tier: 'free' as const, priceId: null },
  BASIC: { name: 'Basic', tier: 'basic' as const, priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID },
  PRO: { name: 'Pro', tier: 'pro' as const, priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];

const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

// Demo users for NO DB mode (if DATABASE_URL is not set)
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; simulatedTier?: AppPlanTier; favoriteIndicatorIds?: string[] }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User (Free)", email: "user@example.com", passwordPlainText: "password", username: "demouser", simulatedTier: 'free', favoriteIndicatorIds: ['CPI_YOY_PCT'] },
  "basic@example.com": { id: "demobasic-1", name: "Demo User (Basic)", email: "basic@example.com", passwordPlainText: "password", username: "basicuser", simulatedTier: 'basic', favoriteIndicatorIds: ['SP500', 'UNRATE'] },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User (Pro)", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin", simulatedTier: 'pro', favoriteIndicatorIds: ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GDP_GROWTH'] },
};

if (IS_DATABASE_MODE_ACTIVE) {
  console.log("[NextAuth] CONFIG: Running in DATABASE Mode.");
} else {
  console.warn("[NextAuth] CONFIG: Running in NO DATABASE Mode. Auth will use demoUsers.");
}

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
        if (!IS_DATABASE_MODE_ACTIVE) { // NO DB MODE
          if (!credentials?.email || !credentials?.password) return null;
          const userFromDemo = demoUsers[credentials.email.toLowerCase()];
          if (userFromDemo && userFromDemo.passwordPlainText === credentials.password) {
            return { id: userFromDemo.id, name: userFromDemo.name, email: userFromDemo.email };
          }
          return null;
        }
        // DB MODE
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
        if (!IS_DATABASE_MODE_ACTIVE && user.email) {
            const demoUser = demoUsers[user.email.toLowerCase()];
            if (demoUser) {
                token.simulatedTier = demoUser.simulatedTier;
                token.favoriteIndicatorIds = demoUser.favoriteIndicatorIds || []; // Add demo favorites
            }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        let currentPlanDetails = APP_PLANS.FREE;
        let userFavorites: string[] = [];

        if (IS_DATABASE_MODE_ACTIVE) {
            try {
                const userFromDb = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { 
                        stripeSubscriptionId: true, 
                        stripeCurrentPeriodEnd: true,
                        stripePriceId: true,
                        stripeCustomerId: true,
                        favoriteIndicators: { select: { indicatorId: true } } // Fetch favorites
                    }
                });
                if (userFromDb) {
                    (session.user as any).stripeCustomerId = userFromDb.stripeCustomerId;
                    userFavorites = userFromDb.favoriteIndicators.map(f => f.indicatorId);
                    const isActivePaid = !!userFromDb.stripeSubscriptionId && 
                                     !!userFromDb.stripeCurrentPeriodEnd && 
                                     new Date(userFromDb.stripeCurrentPeriodEnd) > new Date();
                    if (isActivePaid && userFromDb.stripePriceId) {
                        const matchedPlan = Object.values(APP_PLANS).find(p => p.priceId === userFromDb.stripePriceId);
                        if (matchedPlan) currentPlanDetails = matchedPlan;
                        else currentPlanDetails = { name: 'Subscribed (Custom)', tier: 'custom_paid', priceId: userFromDb.stripePriceId } as any;
                    }
                }
            } catch (e) { console.error("SessionCb Error fetching user data from DB:", e); }
        } else if (token.simulatedTier) { // "No DB" mode for demo users
            const matchedPlan = Object.values(APP_PLANS).find(p => p.tier === token.simulatedTier);
            if (matchedPlan) currentPlanDetails = matchedPlan;
            userFavorites = (token.favoriteIndicatorIds as string[] | undefined) || []; // Use demo favorites from token
        }
        (session.user as any).activePlanName = currentPlanDetails.name;
        (session.user as any).activePlanTier = currentPlanDetails.tier;
        (session.user as any).hasActivePaidSubscription = currentPlanDetails.tier !== 'free';
        (session.user as any).favoriteIndicatorIds = userFavorites; // Add favorites to session
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };