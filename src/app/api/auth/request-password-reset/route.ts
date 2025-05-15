// src/app/api/auth/request-password-reset/route.ts
import prisma from "@/lib/prisma"; // Now PrismaClient | null
import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Resend } from 'resend';
import PasswordResetEmail from "@/emails/PasswordResetEmail";

const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    // --- ADD THIS CHECK (early, before Prisma calls) ---
    if (!prisma && process.env.DATABASE_URL) { // Only error out if DB_URL was set but prisma failed to init
      console.error("[API Request PW Reset] Database configured but Prisma instance is null.");
      return NextResponse.json(
        { error: "Password reset service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    // --- END CHECK ---

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // If prisma is null (no DB mode), we can't find a user or store a token.
    // We should still send the generic message.
    if (!prisma) {
        console.warn("[API Request PW Reset] No Database Mode: Sending generic success message for email:", email);
        // Simulate email sending part for demo if needed, but no DB interaction.
        // For simplicity here, we just return the success message.
        // You could also attempt to send an email if Resend is configured,
        // but the reset link wouldn't work without a token store.
        return NextResponse.json({ message: "If an account with this email exists, a password reset link has been sent." }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      console.log(`[API Request PW Reset] Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ message: "If an account with this email exists, a password reset link has been sent." }, { status: 200 });
    }

    // Check if user was created with credentials (has a passwordHash)
    // OAuth users typically shouldn't reset password this way.
    if (!user.passwordHash) {
        console.log(`[API Request PW Reset] User ${email} is likely an OAuth user (no passwordHash). Reset email not sent.`);
         return NextResponse.json({ message: "If this account was created using a social provider (e.g., Google), please reset your password through that provider." }, { status: 200 }); // Slightly different message
    }


    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: user.email!,
        token: hashedToken,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    const { data, error: resendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS || 'EcoDash <onboarding@resend.dev>',
      to: [user.email!],
      subject: 'Reset Your EcoDash Password',
      react: PasswordResetEmail({ userFirstname: user.name || user.username, resetPasswordLink: resetUrl }),
    });

    if (resendError) {
      console.error("[API Request PW Reset] Resend Error:", resendError);
      return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
    }

    console.log("[API Request PW Reset] Password reset email sent successfully via Resend:", data);
    return NextResponse.json({ message: "If an account with this email exists, a password reset link has been sent." }, { status: 200 });

  } catch (error) {
    console.error("[API Request PW Reset] Error:", error);
    if ((error as any).message?.includes("PrismaClientInitializationError")) {
        return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}