// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth"; // Removed User as NextAuthUser as it's not directly used here
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export const APP_PLANS = {
  FREE: { name: 'Free', tier: 'free' as const, priceId: null },
  BASIC: { name: 'Basic', tier: 'basic' as const, priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID },
  PRO: { name: 'Pro', tier: 'pro' as const, priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];

const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

// Demo users for NO DB mode (if DATABASE_URL is not set)
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; simulatedTier?: AppPlanTier; favoriteIndicatorIds?: string[]; provider?: string; }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User (Free)", email: "user@example.com", passwordPlainText: "password", username: "demouser", simulatedTier: 'free', favoriteIndicatorIds: ['CPI_YOY_PCT'], provider: 'credentials' },
  "basic@example.com": { id: "demobasic-1", name: "Demo User (Basic)", email: "basic@example.com", passwordPlainText: "password", username: "basicuser", simulatedTier: 'basic', favoriteIndicatorIds: ['SP500', 'UNRATE'], provider: 'credentials' },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User (Pro)", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin", simulatedTier: 'pro', favoriteIndicatorIds: ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GDP_GROWTH'], provider: 'credentials' },
};

if (IS_DATABASE_MODE_ACTIVE) {
  console.log("[NextAuth] CONFIG: Running in DATABASE Mode.");
} else {
  console.warn("[NextAuth] CONFIG: Running in NO DATABASE Mode. Auth will use demoUsers.");
}

export const authOptions: AuthOptions = {
  adapter: IS_DATABASE_MODE_ACTIVE && prisma ? PrismaAdapter(prisma) : undefined,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // username: { label: "Username", type: "text", optional: true } // Not typically needed for login
      },
      async authorize(credentials) { // credentials can be undefined based on NextAuth types
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        if (!IS_DATABASE_MODE_ACTIVE) { // NO DB MODE
          const userFromDemo = demoUsers[credentials.email.toLowerCase()];
          if (userFromDemo && userFromDemo.passwordPlainText === credentials.password) {
            return { id: userFromDemo.id, name: userFromDemo.name, email: userFromDemo.email, provider: 'credentials' };
          }
          throw new Error("Invalid credentials for demo user.");
        }
        
        // DB MODE
        if (!prisma) throw new Error("Database service not available for authentication.");
        const user = await prisma.user.findUnique({ where: { email: credentials.email.toLowerCase() } });
        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials (user not found or no password set).");
        }
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid credentials (password mismatch).");
        }
        return { id: user.id, name: user.name, email: user.email, image: user.image, provider: 'credentials' };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider) { // This ensures provider is set only during sign-in/link events
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
        if (!token.provider && (user as any).provider) { // If user object from authorize has provider
            token.provider = (user as any).provider;
        }

        if (!IS_DATABASE_MODE_ACTIVE && user.email) {
            const demoUser = demoUsers[user.email.toLowerCase()];
            if (demoUser) {
                token.simulatedTier = demoUser.simulatedTier;
                token.favoriteIndicatorIds = demoUser.favoriteIndicatorIds || [];
                if(!token.provider) token.provider = demoUser.provider || 'credentials';
            }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        if (token.provider) { // Pass provider from token to session
            (session.user as any).provider = token.provider as string;
        }
        
        let currentPlanDetails = APP_PLANS.FREE;
        let userFavorites: string[] = [];

        if (IS_DATABASE_MODE_ACTIVE && prisma) {
            try {
                const userFromDb = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { 
                        stripeSubscriptionId: true, 
                        stripeCurrentPeriodEnd: true,
                        stripePriceId: true,
                        stripeCustomerId: true,
                        favoriteIndicators: { select: { indicatorId: true } }
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
                        else currentPlanDetails = { name: 'Subscribed (Custom)', tier: 'custom_paid' as AppPlanTier, priceId: userFromDb.stripePriceId }; // Cast to AppPlanTier
                    }
                }
            } catch (e) { console.error("SessionCb Error fetching user data from DB:", e); }
        } else if (token.simulatedTier) { 
            const matchedPlan = Object.values(APP_PLANS).find(p => p.tier === token.simulatedTier);
            if (matchedPlan) currentPlanDetails = matchedPlan;
            userFavorites = (token.favoriteIndicatorIds as string[] | undefined) || [];
            if(! (session.user as any).provider && token.provider) { // Ensure demo users also get provider in session
                (session.user as any).provider = token.provider;
            }
        }
        (session.user as any).activePlanName = currentPlanDetails.name;
        (session.user as any).activePlanTier = currentPlanDetails.tier;
        (session.user as any).hasActivePaidSubscription = currentPlanDetails.tier !== 'free';
        (session.user as any).favoriteIndicatorIds = userFavorites;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development", // Uncomment for debugging
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };