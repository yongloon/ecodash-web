// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, User as NextAuthUser } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// --- IMPORTANT: For "NO DB MODE", ensure these are commented out ---
// import { PrismaAdapter } from "@auth/prisma-adapter";
// import prisma from "@/lib/prisma"; 
// import bcrypt from "bcrypt";

// --- SIMULATED IN-MEMORY USER STORE (FOR DEMO/TESTING ONLY) ---
const demoUsers: Record<string, { id: string; name?: string; email: string; passwordPlainText: string; username?: string }> = {
  "user@example.com": { id: "demouser-1", name: "Demo User", email: "user@example.com", passwordPlainText: "password", username: "demouser" },
  "admin@example.com": { id: "demoadmin-1", name: "Admin User", email: "admin@example.com", passwordPlainText: "adminpass", username: "admin" },
};
// --- END SIMULATED USER STORE ---

const IS_DB_MODE_ENABLED = !!process.env.DATABASE_URL; // Check if DATABASE_URL is set

if (IS_DB_MODE_ENABLED) {
  console.log("[NextAuth] Running in DATABASE MODE.");
  // Dynamically import Prisma only if in DB mode to avoid issues when DATABASE_URL is not set
  // This is a bit advanced; simpler is to ensure prisma import is commented if DATABASE_URL is not set.
  // For now, we'll rely on commenting out prisma import if DATABASE_URL is not present.
} else {
  console.warn("[NextAuth] Running in NO DATABASE MODE for demo users. Prisma adapter and DB interactions should be disabled/mocked.");
}


export const authOptions: AuthOptions = {
  // --- For "NO DB MODE", ensure adapter is COMMENTED OUT ---
  // adapter: IS_DB_MODE_ENABLED ? PrismaAdapter(prisma) : undefined, // More robust would be conditional import of PrismaAdapter and prisma

  providers: [
    GoogleProvider({ // Google can still function without DB for session, but account linking might not work
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
        console.log("[Auth Attempt] Credentials Email:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.error("[Auth Error] Missing email or password.");
          return null;
        }
        const userFromDemoStore = demoUsers[credentials.email.toLowerCase()];
        if (userFromDemoStore && userFromDemoStore.passwordPlainText === credentials.password) {
          console.log("[Auth Success] Demo user found:", userFromDemoStore.email);
          return { id: userFromDemoStore.id, name: userFromDemoStore.name, email: userFromDemoStore.email };
        }
        console.warn("[Auth Failed] Demo user not found or password mismatch:", credentials.email);
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id && session.user) {
        (session.user as any).id = token.id as string;

        // --- Conditional DB call for session enrichment ---
        if (IS_DB_MODE_ENABLED) {
          // Only attempt to import and use Prisma if DB mode is enabled
          // This dynamic import is tricky here. Better approach: structure code so Prisma is only imported
          // at the top level if IS_DB_MODE_ENABLED.
          // For now, let's assume if DATABASE_URL is set, `import prisma from '@/lib/prisma'` at the top IS active.
          // And if DATABASE_URL is NOT set, `import prisma from '@/lib/prisma'` at the top is COMMENTED OUT.
          
          // If you have `import prisma from '@/lib/prisma'` active AND DATABASE_URL is set:
          try {
            const prisma = (await import('@/lib/prisma')).default; // Dynamic import
            const userFromDb = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { 
                    stripeCustomerId: true,
                    stripeSubscriptionId: true, 
                    stripeCurrentPeriodEnd: true,
                    stripePriceId: true
                }
            });
            if (userFromDb) {
                (session.user as any).stripeCustomerId = userFromDb.stripeCustomerId;
                (session.user as any).stripeSubscriptionId = userFromDb.stripeSubscriptionId;
                const isActive = !!userFromDb.stripeSubscriptionId && 
                                 !!userFromDb.stripeCurrentPeriodEnd && 
                                 new Date(userFromDb.stripeCurrentPeriodEnd) > new Date();
                (session.user as any).hasActiveSubscription = isActive;
                if (isActive && userFromDb.stripePriceId) {
                    const plansInAuth = [ /* your plans array or fetch from a shared place */ ];
                    const currentPlan = plansInAuth.find(p => p.priceId === userFromDb.stripePriceId);
                    (session.user as any).activePlanName = currentPlan?.name || 'Active';
                }
            } else {
                (session.user as any).hasActiveSubscription = false;
            }
          } catch (e) {
            console.error("[Session Callback] Error fetching user Stripe data (DB MODE):", e);
            (session.user as any).hasActiveSubscription = false; // Fallback
          }
        } else {
             // "NO DB" mode
            console.log("[Session Callback] NO DB MODE - Skipping DB call for session enrichment.");
            (session.user as any).hasActiveSubscription = false; // Default for demo users
            // You could simulate subscription for specific demo users here if needed
            // if (token.email === "admin@example.com") {
            //    (session.user as any).hasActiveSubscription = true;
            //    (session.user as any).activePlanName = 'Pro (Demo)';
            // }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  // debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };