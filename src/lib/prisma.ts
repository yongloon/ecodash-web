// src/lib/prisma.ts
// import { PrismaClient } from '@prisma/client'; // Comment out original

// declare global {
//   var prisma: PrismaClient | undefined;
// }

// const prisma =
//   global.prisma ||
//   new PrismaClient({
//     // log: ['query', 'info', 'warn', 'error'],
//   });

// if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// export default prisma;


// --- TEMPORARY DEBUGGING VERSION ---
console.error("DEBUG: src/lib/prisma.ts is being imported. THIS SHOULD NOT HAPPEN FOR NO-DB LOGIN.");

const mockPrisma = {
  user: {
    findUnique: (...args: any[]) => {
      console.error("DEBUG: MOCK prisma.user.findUnique CALLED! ARGS:", args);
      throw new Error("MOCK PRISMA: Database interaction attempted during no-DB mode from user.findUnique.");
    },
    create: (...args: any[]) => {
      console.error("DEBUG: MOCK prisma.user.create CALLED! ARGS:", args);
      throw new Error("MOCK PRISMA: Database interaction attempted during no-DB mode from user.create.");
    },
    // Add other methods if errors point to them
  },
  // Add other models if needed for debugging
  passwordResetToken: {
    create: (...args: any[]) => {
        console.error("DEBUG: MOCK prisma.passwordResetToken.create CALLED! ARGS:", args);
        throw new Error("MOCK PRISMA: Database interaction attempted for passwordResetToken.create.");
    },
    findMany: (...args: any[]) => {
        console.error("DEBUG: MOCK prisma.passwordResetToken.findMany CALLED! ARGS:", args);
        throw new Error("MOCK PRISMA: Database interaction attempted for passwordResetToken.findMany.");
    },
    // ... etc.
  }
};

console.warn("DEBUG: Using MOCKED Prisma instance. NO DATABASE WILL BE CONTACTED from this instance.");

export default mockPrisma as any; // Cast to any to satisfy existing type usage temporarily