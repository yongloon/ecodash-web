// src/app/api/auth/confirm-password-reset/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token: plainToken, password } = body;

    if (!plainToken || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Find token by iterating and comparing (since we stored hashed tokens)
    // This is not super efficient for many tokens. A better way for production
    // might be to also store the plain token temporarily with a short expiry
    // or use a different crypto method that allows direct lookup if security permits.
    // For now, we'll iterate. In a real system, also clean up expired tokens.
    const allTokens = await prisma.passwordResetToken.findMany({
        where: { expiresAt: { gt: new Date() } } // Only check non-expired tokens
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

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Update user's password
    await prisma.user.update({
      where: { id: dbTokenRecord.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Delete the used token (or all tokens for that user for good measure)
    await prisma.passwordResetToken.delete({
      where: { id: dbTokenRecord.id },
    });
    // Optionally: await prisma.passwordResetToken.deleteMany({ where: { userId: dbTokenRecord.userId } });


    return NextResponse.json({ message: "Password has been reset successfully." }, { status: 200 });

  } catch (error) {
    console.error("Confirm Password Reset Error:", error);
    // Avoid leaking too much info in production errors
    return NextResponse.json({ error: "An unexpected error occurred while resetting password." }, { status: 500 });
  }
}