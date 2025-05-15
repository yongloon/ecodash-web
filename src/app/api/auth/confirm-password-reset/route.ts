// src/app/api/auth/confirm-password-reset/route.ts
import prisma from "@/lib/prisma"; // Now PrismaClient | null
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    // --- ADD THIS CHECK ---
    if (!prisma) {
      console.error("[API Confirm PW Reset] Database not configured. Prisma instance is null.");
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable. Please try again later or contact support." },
        { status: 503 }
      );
    }
    // --- END CHECK ---

    const body = await request.json();
    const { token: plainToken, password } = body;

    if (!plainToken || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const allTokens = await prisma.passwordResetToken.findMany({
        where: { expiresAt: { gt: new Date() } }
    });

    let dbTokenRecord = null;
    for (const record of allTokens) {
        const tokenMatch = await bcrypt.compare(plainToken, record.token);
        if (tokenMatch) {
            dbTokenRecord = record;
            break;
        }
    }

    if (!dbTokenRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: dbTokenRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    await prisma.passwordResetToken.delete({
      where: { id: dbTokenRecord.id },
    });

    return NextResponse.json({ message: "Password has been reset successfully." }, { status: 200 });

  } catch (error) {
    console.error("[API Confirm PW Reset] Error:", error);
    if ((error as any).message?.includes("PrismaClientInitializationError")) {
        return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: "An unexpected error occurred while resetting password." }, { status: 500 });
  }
}