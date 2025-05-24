// src/app/api/account/change-password/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SALT_ROUNDS = 10;
const IS_DATABASE_MODE_ACTIVE = !!process.env.DATABASE_URL;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  if (!userId) return NextResponse.json({ error: "User ID not found" }, { status: 401 });

  if (!IS_DATABASE_MODE_ACTIVE || !prisma) {
    console.warn("[API Change Password] No Database Mode or Prisma client null. Password change disabled.");
    // In No DB mode, we can't actually change passwords.
    // Check if the user is a demo user trying to change a known demo password.
    // This is a very simplified check for demo purposes.
    const { email } = session.user as any;
    if (email === "user@example.com" || email === "basic@example.com" || email === "admin@example.com") {
        return NextResponse.json({ error: "Password change is disabled for demo accounts in this mode." }, { status: 403 });
    }
    return NextResponse.json({ error: "Password change service is currently unavailable." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Check if the user has a passwordHash. If not, they likely signed up via OAuth.
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Password change is not applicable for accounts created via social login. Please manage your password with your social provider." }, { status: 400 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ message: "Password updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("[API Change Password] Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}