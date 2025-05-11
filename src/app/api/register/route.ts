// src/app/api/register/route.ts
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, username } = body; // Added name and username

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!username) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }


    const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 }); // 409 Conflict
    }

    const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUserByUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0], // Default name from email part
        username,
      },
    });

    // Don't return passwordHash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}