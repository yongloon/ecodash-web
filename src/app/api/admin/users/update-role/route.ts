// src/app/api/admin/users/update-role/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, UserRole } from '@/app/api/auth/[...nextauth]/route'; // Ensure UserRole is exported
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateRoleSchema = z.object({
  userIdToUpdate: z.string().min(1),
  newRole: z.enum([UserRole.USER, UserRole.ADMIN]), // Use the enum/type
});

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized: Access Denied.' }, { status: 403 });
    }
    
    const currentAdminUserId = (session.user as any).id;

    if (!prisma) {
        return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    }

    try {
        const body = await request.json();
        const validation = updateRoleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
        }
        const { userIdToUpdate, newRole } = validation.data;

        if (userIdToUpdate === currentAdminUserId && newRole === UserRole.USER) {
            return NextResponse.json({ error: "Admins cannot revoke their own admin status." }, { status: 400 });
        }

        const userToUpdate = await prisma.user.findUnique({ where: { id: userIdToUpdate } });
        if (!userToUpdate) {
            return NextResponse.json({ error: "User to update not found." }, { status: 404 });
        }
        
        // Prevent demo admin role change if it's the special demo admin email to avoid locking out in No DB mode if DB is later connected
        if (userToUpdate.email === "admin@example.com" && newRole === UserRole.USER && process.env.NODE_ENV === 'development') {
            // In a real production scenario, you might have more robust checks or prevent certain system accounts from being demoted
            console.warn("Attempt to demote the primary demo admin account. Allowed in dev, but be careful.");
        }


        const updatedUser = await prisma.user.update({
            where: { id: userIdToUpdate },
            data: { role: newRole },
            select: { id: true, email: true, name: true, role: true } // Return limited info
        });

        return NextResponse.json({ message: `User ${updatedUser.email || updatedUser.id} role updated to ${newRole}.`, user: updatedUser }, { status: 200 });

    } catch (error: any) {
        console.error("[API POST /admin/users/update-role] Error:", error);
        return NextResponse.json({ error: 'Failed to update user role.' }, { status: 500 });
    }
}