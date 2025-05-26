// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { UserRole } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Access Denied.' }, { status: 403 });
    }

    if (!prisma) {
        // Should not happen if admin panel is accessed, but as a safeguard
        return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
                stripeSubscriptionId: true,
                // Do NOT select passwordHash or other sensitive fields
            }
        });
        return NextResponse.json(users, { status: 200 });
    } catch (error: any) {
        console.error("[API GET /admin/users] DB Error:", error.message);
        return NextResponse.json({ error: 'Failed to fetch users.' }, { status: 500 });
    }
}