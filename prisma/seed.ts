// prisma/seed.ts
import { PrismaClient, UserRole, AppPlanTier } from '@prisma/client'; // Assuming AppPlanTier is part of your Prisma schema if you store it directly
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Define APP_PLANS locally if not directly importable or to avoid circular deps
// This should ideally match what's in your authOptions or a shared constants file
const SEED_APP_PLANS = {
  FREE: { name: 'Free', tier: 'free' as const, priceId: null },
  BASIC: { name: 'Basic', tier: 'basic' as const, priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID || 'price_basic_seed_placeholder' },
  PRO: { name: 'Pro', tier: 'pro' as const, priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID || 'price_pro_seed_placeholder' },
} as const;


async function main() {
  console.log(`🌱 Starting database seeding ...`);

  // --- Create Admin User ---
  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('adminpass', SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'EcoDash Admin',
        username: 'ecodashadmin',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        emailVerified: new Date(), // Mark as verified for convenience in dev
        // Optionally, assign a Stripe Customer ID and Pro plan for testing
        stripeCustomerId: 'cus_seed_admin',
        stripeSubscriptionId: 'sub_seed_admin_pro',
        stripePriceId: SEED_APP_PLANS.PRO.priceId,
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Active for 30 days
      },
    });
    console.log(`👤 Created ADMIN user: ${adminEmail} (Password: adminpass)`);
  } else {
    console.log(`👤 Admin user ${adminEmail} already exists.`);
  }

  // --- Create Basic User ---
  const basicUserEmail = 'basic@example.com';
  const existingBasicUser = await prisma.user.findUnique({
    where: { email: basicUserEmail },
  });

  if (!existingBasicUser) {
    const basicPasswordHash = await bcrypt.hash('password', SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: basicUserEmail,
        name: 'Basic User',
        username: 'basicuser',
        passwordHash: basicPasswordHash,
        role: UserRole.USER,
        emailVerified: new Date(),
        stripeCustomerId: 'cus_seed_basic',
        stripeSubscriptionId: 'sub_seed_basic_plan',
        stripePriceId: SEED_APP_PLANS.BASIC.priceId,
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      },
    });
    console.log(`👤 Created BASIC user: ${basicUserEmail} (Password: password)`);
  } else {
    console.log(`👤 Basic user ${basicUserEmail} already exists.`);
  }

  // --- Create Free User ---
  const freeUserEmail = 'user@example.com';
  const existingFreeUser = await prisma.user.findUnique({
    where: { email: freeUserEmail },
  });

  if (!existingFreeUser) {
    const freePasswordHash = await bcrypt.hash('password', SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email: freeUserEmail,
        name: 'Free User',
        username: 'freeuser',
        passwordHash: freePasswordHash,
        role: UserRole.USER,
        emailVerified: new Date(),
        // No Stripe info for free user by default
      },
    });
    console.log(`👤 Created FREE user: ${freeUserEmail} (Password: password)`);
  } else {
    console.log(`👤 Free user ${freeUserEmail} already exists.`);
  }

  // --- Seed Favorite Indicators (Example for basicUser) ---
  if (existingBasicUser || !existingBasicUser) { // Seed favorites if basic user exists or was just created
    const userToSeedFavorites = await prisma.user.findUnique({where: {email: basicUserEmail}});
    if (userToSeedFavorites) {
        const favoriteIndicatorIds = ['SPX500_TIINGO', 'UNRATE', 'CPI_YOY_PCT'];
        for (const indicatorId of favoriteIndicatorIds) {
            const existingFavorite = await prisma.favoriteIndicator.findUnique({
                where: { userId_indicatorId: { userId: userToSeedFavorites.id, indicatorId } },
            });
            if (!existingFavorite) {
                await prisma.favoriteIndicator.create({
                    data: {
                        userId: userToSeedFavorites.id,
                        indicatorId: indicatorId,
                    },
                });
                console.log(`⭐ Added favorite '${indicatorId}' for ${basicUserEmail}`);
            }
        }
    }
  }
  
  // --- Seed Alerts (Example for basicUser) ---
   if (existingBasicUser || !existingBasicUser) {
    const userToSeedAlerts = await prisma.user.findUnique({where: {email: basicUserEmail}});
    if(userToSeedAlerts){
        const alertsToSeed = [
            { indicatorId: 'BTC_PRICE_USD', targetValue: 75000, condition: 'ABOVE' as const },
            { indicatorId: 'UNRATE', targetValue: 3.5, condition: 'BELOW' as const, isEnabled: false },
        ];
        for (const alertData of alertsToSeed) {
            const existingAlert = await prisma.userAlert.findFirst({
                where: { 
                    userId: userToSeedAlerts.id, 
                    indicatorId: alertData.indicatorId,
                    targetValue: alertData.targetValue,
                    condition: alertData.condition
                },
            });
            if(!existingAlert) {
                await prisma.userAlert.create({
                    data: {
                        userId: userToSeedAlerts.id,
                        ...alertData
                    }
                });
                console.log(`🔔 Added alert for '${alertData.indicatorId}' for ${basicUserEmail}`);
            }
        }
    }
   }


  console.log(`🌳 Seeding finished.`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("🔌 Prisma client disconnected.");
  });