// src/app/api/auth/request-password-reset/route.ts
import prisma from "@/lib/prisma"; // Now PrismaClient | null
import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Resend } from 'resend';
import PasswordResetEmail from "@/emails/PasswordResetEmail";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // If prisma is null (no DB mode), or Resend isn't configured, we can't fully process.
    // We should still send the generic success-like message for security (don't reveal email existence).
    if (!prisma || !resend) {
        if (!prisma) console.warn("[API Request PW Reset] No Database Mode or Prisma client null. Cannot store/verify token.");
        if (!resend) console.warn("[API Request PW Reset] Resend not configured. Cannot send email.");
        
        // Even if we can't send an email or store a token, maintain the facade for security.
        return NextResponse.json({ message: "If an account with this email exists and password reset is enabled, a link has been sent." }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
      console.log(`[API Request PW Reset] Password reset requested for non-existent or non-credential email: ${email}`);
      return NextResponse.json({ message: "If an account with this email exists and is eligible for password reset, a link has been sent." }, { status: 200 });
    }
    if (!user.passwordHash) {
      console.log(`[API Request PW Reset] User ${email} is likely an OAuth user (no passwordHash). Reset email not sent this way.`);
      return NextResponse.json({ message: "If this account was created using a social provider (e.g., Google), please reset your password through that provider." }, { status: 200 });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, email: user.email!, token: hashedToken, expiresAt },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    const { data, error: resendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS || 'EcoDash <noreply@yourdomain.com>', // Use a noreply or specific sender
      to: [user.email!],
      subject: 'Reset Your EcoDash Password',
      react: PasswordResetEmail({ userFirstname: user.name || user.username, resetPasswordLink: resetUrl }),
    });

    if (resendError) {
      console.error("[API Request PW Reset] Resend Error:", resendError);
      // Still return a generic message to the client for security, but log the internal error
      return NextResponse.json({ message: "Password reset request processed. If an account exists, an email will be sent if possible." }, { status: 200 });
    }

    console.log("[API Request PW Reset] Password reset email sent successfully via Resend for:", email);
    return NextResponse.json({ message: "If an account with this email exists and is eligible for password reset, a link has been sent." }, { status: 200 });

  } catch (error) {
    console.error("[API Request PW Reset] General Error:", error);
    if ((error as any).name === 'PrismaClientInitializationError' || (error as any).message?.includes("prisma")) {
        // This case might be redundant if the initial !prisma check handles it, but good for safety.
        return NextResponse.json({ error: "Password reset service is temporarily unavailable due to a database issue." }, { status: 503 });
    }
    // Generic message to client for other errors
    return NextResponse.json({ message: "Your request has been processed. If an account with this email exists and password reset is enabled, an email will be sent if possible." }, { status: 200 });
  }
}