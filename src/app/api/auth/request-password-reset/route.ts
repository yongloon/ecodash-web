// src/app/api/auth/request-password-reset/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto"; // For generating token
import bcrypt from "bcrypt"; // For hashing token before storing
import { Resend } from 'resend';
import PasswordResetEmail from "@/emails/PasswordResetEmail"; // We'll create this email component

const resend = new Resend(process.env.RESEND_API_KEY);
const SALT_ROUNDS = 10; // For hashing the reset token

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // IMPORTANT: Do not reveal if the email exists or not for security.
      // Send a generic success message even if the user isn't found.
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ message: "If an account with this email exists, a password reset link has been sent." }, { status: 200 });
    }

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    // Set token expiry (e.g., 1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store the hashed token in the database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email: user.email!, // User email
        token: hashedToken,
        expiresAt,
      },
    });

    // Construct the reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM_ADDRESS || 'EcoDash <onboarding@resend.dev>', // Default if not set
      to: [user.email!],
      subject: 'Reset Your EcoDash Password',
      react: PasswordResetEmail({ userFirstname: user.name || user.username || 'User', resetPasswordLink: resetUrl }),
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
    }

    console.log("Password reset email sent successfully via Resend:", data);
    return NextResponse.json({ message: "If an account with this email exists, a password reset link has been sent." }, { status: 200 });

  } catch (error) {
    console.error("Request Password Reset Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}