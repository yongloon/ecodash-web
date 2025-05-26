// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions } from "next-auth";
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

export type UserRole = "USER" | "ADMIN"; // For convenience
const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; simulatedTier?: AppPlanTier; favoriteIndicatorIds?: string[]; provider?: string; role?: UserRole }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User (Free)", email: "user@example.com", passwordPlainText: "password", username: "demouser", simulatedTier: 'free', favoriteIndicatorIds: ['CPI_YOY_PCT'], provider: 'credentials', role: 'USER' },
  "basic@example.com": { id: "demobasic-1", name: "Demo User (Basic)", email: "basic@example.com", passwordPlainText: "password", username: "basicuser", simulatedTier: 'basic', favoriteIndicatorIds: ['SP500', 'UNRATE'], provider: 'credentials', role: 'USER' },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User (Pro)", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin", simulatedTier: 'pro', favoriteIndicatorIds: ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GDP_GROWTH'], provider: 'credentials', role: 'ADMIN' },
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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        if (!IS_DATABASE_MODE_ACTIVE) { // NO DB MODE
          const userFromDemo = demoUsers[credentials.email.toLowerCase()];
          if (userFromDemo && userFromDemo.passwordPlainText === credentials.password) {
            return { id: userFromDemo.id, name: userFromDemo.name, email: userFromDemo.email, provider: 'credentials', role: userFromDemo.role || 'USER' }; 
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
        return { id: user.id, name: user.name, email: user.email, image: user.image, provider: 'credentials', role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider) { 
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
        if ((user as any).role) { 
            token.role = (user as any).role;
        }
        if (!token.provider && (user as any).provider) { 
            token.provider = (user as any).provider;
        }

        if (!IS_DATABASE_MODE_ACTIVE && user.email) {
            const demoUser = demoUsers[user.email.toLowerCase()];
            if (demoUser) {
                token.simulatedTier = demoUser.simulatedTier;
                token.favoriteIndicatorIds = demoUser.favoriteIndicatorIds || [];
                if(!token.role) { 
                    token.role = demoUser.role || 'USER';
                }
                if(!token.provider) token.provider = demoUser.provider || 'credentials';
            }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as any).id = token.id as string;
        if (token.provider) { 
            (session.user as any).provider = token.provider as string;
        }
        if (token.role) { 
            (session.user as any).role = token.role as UserRole;
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
                        role: true, 
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
                        else currentPlanDetails = { name: 'Subscribed (Custom)', tier: 'custom_paid' as AppPlanTier, priceId: userFromDb.stripePriceId };
                    }
                    // Prioritize role from DB if not already set (e.g. by demo user config during authorize)
                    if (!(session.user as any).role && userFromDb.role) { 
                        (session.user as any).role = userFromDb.role;
                    } else if (!userFromDb.role && (session.user as any).role) {
                        // This case is less likely if DB is source of truth, but ensures session role is accurate
                    } else if (userFromDb.role) { // Default to DB role if session doesn't have one yet for this token
                        (session.user as any).role = userFromDb.role;
                    }

                }
            } catch (e) { console.error("SessionCb Error fetching user data from DB:", e); }
        } else if (token.simulatedTier) { // NO DB MODE
            const matchedPlan = Object.values(APP_PLANS).find(p => p.tier === token.simulatedTier);
            if (matchedPlan) currentPlanDetails = matchedPlan;
            userFavorites = (token.favoriteIndicatorIds as string[] | undefined) || [];
            if (!(session.user as any).role && token.role) { 
                (session.user as any).role = token.role;
            }
            if(!(session.user as any).provider && token.provider) {
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
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };