// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

// Centralized Plan Definitions (ensure Price IDs match your Stripe Dashboard and .env)
export const APP_PLANS = {
  FREE: { name: 'Free', tier: 'free', priceId: null },
  BASIC: { name: 'Basic', tier: 'basic', priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID },
  PRO: { name: 'Pro', tier: 'pro', priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [ /* ... your Google and Credentials providers ... */ ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && token.id && session.user) {
        (session.user as any).id = token.id as string;

        let currentPlan = APP_PLANS.FREE; // Default to Free

        if (process.env.DATABASE_URL) { // Only check DB if configured
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
                    const isActivePaidSubscription = 
                        !!userFromDb.stripeSubscriptionId && 
                        !!userFromDb.stripeCurrentPeriodEnd && 
                        new Date(userFromDb.stripeCurrentPeriodEnd) > new Date();

                    if (isActivePaidSubscription && userFromDb.stripePriceId) {
                        const matchedPlan = Object.values(APP_PLANS).find(p => p.priceId === userFromDb.stripePriceId);
                        if (matchedPlan) {
                            currentPlan = matchedPlan;
                        } else {
                            console.warn(`User ${token.id} has active subscription with unknown priceId: ${userFromDb.stripePriceId}`);
                            // Fallback for active but unrecognized plan (e.g. old plan)
                            currentPlan = { name: 'Subscribed (Custom)', tier: 'custom_paid', priceId: userFromDb.stripePriceId };
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching user Stripe data for session:", e);
                // Keep currentPlan as FREE on error
            }
        } else {
            // "No DB" mode simulation (example)
            if (token.email === "admin@example.com") { 
              currentPlan = APP_PLANS.PRO; // Simulate Pro for demo admin
            } else if (token.email === "basicuser@example.com") { // Add a demo basic user
              // currentPlan = APP_PLANS.BASIC; // Simulate Basic
            }
        }
        (session.user as any).activePlanName = currentPlan.name;
        (session.user as any).activePlanTier = currentPlan.tier;
        (session.user as any).hasActivePaidSubscription = currentPlan.tier !== 'free'; // Simplified

         // --- Fetch Favorite Indicator IDs and add to session ---
        if (process.env.DATABASE_URL) { // Only if DB is configured
            try {
                const favorites = await prisma.favoriteIndicator.findMany({
                    where: { userId: token.id as string },
                    select: { indicatorId: true },
                });
                (session.user as any).favoriteIndicatorIds = favorites.map(fav => fav.indicatorId);
            } catch (e) {
                console.error("Error fetching user favorites for session:", e);
                (session.user as any).favoriteIndicatorIds = []; // Default to empty array on error
            }
        } else {
            (session.user as any).favoriteIndicatorIds = []; // No DB, no favorites
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };