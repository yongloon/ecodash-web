// src/app/api/register/route.ts
import prisma from "@/lib/prisma"; // Now PrismaClient | null
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // --- PRISMA CHECK ---
    if (!prisma) {
      console.error("[API Register] Database not configured. Prisma instance is null. Cannot register user.");
      return NextResponse.json(
        { error: "Registration is temporarily unavailable. Please try again later or contact support." },
        { status: 503 } // 503 Service Unavailable
      );
    }
    // --- END PRISMA CHECK ---

    const body = await request.json();
    const { email, password, name, username } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!username) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const existingUserByEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUserByUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || username,
        username,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("[API Register] Registration Error:", error);
    // More specific check for Prisma client issues if the initial check somehow passed or error originated differently
    if ((error as any).name === 'PrismaClientInitializationError' || (error as any).message?.includes("prisma")) {
        return NextResponse.json({ error: "Database service unavailable for registration." }, { status: 503 });
    }
    return NextResponse.json({ error: "An unexpected error occurred during registration." }, { status: 500 });
  }
}