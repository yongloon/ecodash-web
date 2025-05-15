// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | null = null;

if (process.env.DATABASE_URL) {
  console.log("[Prisma] DATABASE_URL is set. Initializing Prisma Client.");
  if (process.env.NODE_ENV === 'production') {
    prismaInstance = new PrismaClient();
  } else {
    if (!global.prisma) {
      global.prisma = new PrismaClient({
        // log: ['query', 'info', 'warn', 'error'], // Uncomment for detailed logging in dev
      });
    }
    prismaInstance = global.prisma;
  }
} else {
  console.warn("[Prisma] DATABASE_URL is NOT set. Prisma Client will NOT be initialized. Database-dependent features will be disabled or use mocked behavior.");
  // prismaInstance remains null
}

export default prismaInstance; // This can be PrismaClient | null