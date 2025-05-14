// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// --- For DATABASE MODE, uncomment these ---
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma"; // Ensure this path is correct to your prisma client instance
import bcrypt from "bcrypt";
// --- ---

// --- For NO DB MODE (demo users only), comment out the Prisma/bcrypt imports and adapter below ---

// --- Centralized Plan Definitions ---
export const APP_PLANS = { // <<< ENSURE 'export' IS HERE
  FREE: { name: 'Free', tier: 'free' as const, priceId: null },
  BASIC: { name: 'Basic', tier: 'basic' as const, priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID },
  PRO: { name: 'Pro', tier: 'pro' as const, priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID },
  // Add other plans if you have them, e.g., Enterprise
  // ENTERPRISE: { name: 'Enterprise', tier: 'enterprise' as const, priceId: process.env.STRIPE_ENTERPRISE_PLAN_PRICE_ID },
} as const;

export type AppPlanTier = typeof APP_PLANS[keyof typeof APP_PLANS]['tier'];
// --- End Plan Definitions ---


// --- SIMULATED IN-MEMORY USER STORE (FOR "NO DB" DEMO/TESTING ONLY) ---
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string; simulatedTier?: AppPlanTier }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User (Free)", email: "user@example.com", passwordPlainText: "password", username: "demouser", simulatedTier: 'free' },
  "basic@example.com": { id: "demobasic-1", name: "Demo User (Basic)", email: "basic@example.com", passwordPlainText: "password", username: "basicuser", simulatedTier: 'basic' },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User (Pro)", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin", simulatedTier: 'pro' },
};
// --- END SIMULATED USER STORE ---

const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

if (IS_DATABASE_MODE_ACTIVE) {
  console.log("[NextAuth] CONFIG: Running in DATABASE Mode.");
} else {
  console.warn("[NextAuth] CONFIG: Running in NO DATABASE Mode (DATABASE_URL not set). Credentials will use demoUsers. Registration, password reset, and Stripe DB updates will not function fully.");
}

export const authOptions: AuthOptions = {
  // --- Conditional Adapter: UNCOMMENT for DB mode, COMMENT OUT for NO DB mode ---
  adapter: IS_DATABASE_MODE_ACTIVE ? PrismaAdapter(prisma) : undefined,

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
      async authorize(credentials): Promise<NextAuthUser | null> {
        console.log("[AUTH PROVIDER] Credentials authorize called for:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH PROVIDER] Credentials Error: Missing email or password.");
          return null;
        }

        if (IS_DATABASE_MODE_ACTIVE) {
          console.log("[AUTH PROVIDER] Using DATABASE for authentication.");
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });
          if (!user || !user.passwordHash) {
            console.warn("[AUTH PROVIDER DB] User not found or no password hash for:", credentials.email);
            return null;
          }
          const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValidPassword) {
            console.warn("[AUTH PROVIDER DB] Invalid password for:", credentials.email);
            return null;
          }
          console.log("[AUTH PROVIDER DB] Success for:", user.email);
          return { id: user.id, name: user.name, email: user.email, image: user.image };
        } else {
          // "NO DATABASE" / IN-MEMORY DEMO USER AUTHENTICATION
          console.log("[AUTH PROVIDER] Using IN-MEMORY demoUsers for authentication.");
          const emailLower = credentials.email.toLowerCase();
          const userFromDemoStore = demoUsers[emailLower];
          if (userFromDemoStore && userFromDemoStore.passwordPlainText === credentials.password) {
            console.log("[AUTH PROVIDER DEMO] Success for:", userFromDemoStore.email);
            return { id: userFromDemoStore.id, name: userFromDemoStore.name, email: userFromDemoStore.email };
          }
          console.warn("[AUTH PROVIDER DEMO] Failed for:", emailLower);
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
        if (!IS_DATABASE_MODE_ACTIVE && user.email) { // Add simulated tier for demo users
            const demoUser = demoUsers[user.email.toLowerCase()];
            if (demoUser?.simulatedTier) {
                token.simulatedTier = demoUser.simulatedTier;
            }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id && session.user) {
        (session.user as any).id = token.id as string;

        let currentPlan = APP_PLANS.FREE;

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
                    const isActivePaidSubscription = 
                        !!userFromDb.stripeSubscriptionId && 
                        !!userFromDb.stripeCurrentPeriodEnd && 
                        new Date(userFromDb.stripeCurrentPeriodEnd) > new Date();
                    
                    if (isActivePaidSubscription && userFromDb.stripePriceId) {
                        const matchedPlan = Object.values(APP_PLANS).find(p => p.priceId === userFromDb.stripePriceId);
                        if (matchedPlan) currentPlan = matchedPlan;
                        else currentPlan = { name: 'Subscribed (Custom)', tier: 'custom_paid', priceId: userFromDb.stripePriceId } as any;
                    }
                }
            } catch (e) { console.error("Error fetching user Stripe data for session:", e); }
        } else {
            // "No DB" mode simulation - use simulatedTier from JWT
            if (token.simulatedTier) {
                const matchedPlan = Object.values(APP_PLANS).find(p => p.tier === token.simulatedTier);
                if (matchedPlan) currentPlan = matchedPlan;
            }
        }
        (session.user as any).activePlanName = currentPlan.name;
        (session.user as any).activePlanTier = currentPlan.tier;
        (session.user as any).hasActivePaidSubscription = currentPlan.tier !== 'free';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };