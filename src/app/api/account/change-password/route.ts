// src/app/api/account/change-password/route.ts
import prisma from "@/lib/prisma"; // Now PrismaClient | null
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
  }

  try {
    // --- ADD THIS CHECK ---
    if (!prisma) {
      console.error("[API Change Password] Database not configured. Prisma instance is null.");
      return NextResponse.json(
        { error: "Password change service is temporarily unavailable." },
        { status: 503 }
      );
    }
    // --- END CHECK ---

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new passwords are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.passwordHash) {
      // This user likely signed up via OAuth and doesn't have a local password
      return NextResponse.json({ error: "Password change is not applicable for accounts created via social login." }, { status: 400 });
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
     if ((error as any).message?.includes("PrismaClientInitializationError")) {
        return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}