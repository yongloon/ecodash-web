// src/app/api/users/alerts/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';

const alertSchema = z.object({
  indicatorId: z.string().min(1),
  targetValue: z.number(),
  condition: z.enum(["ABOVE", "BELOW"]),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const userTier: AppPlanTier | undefined = (session.user as any)?.activePlanTier;

  if (!canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP)) { // Assuming a new feature key
    return NextResponse.json({ error: 'Access denied to alerts feature.' }, { status: 403 });
  }

  if (!prisma) {
    return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
  }

  try {
    const alerts = await prisma.userAlert.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(alerts, { status: 200 });
  } catch (error: any) {
    console.error("[API GET /users/alerts] DB Error:", error.message);
    return NextResponse.json({ error: 'Failed to fetch alerts.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const userTier: AppPlanTier | undefined = (session.user as any)?.activePlanTier;

  if (!canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP)) {
    return NextResponse.json({ error: 'Upgrade to create alerts.' }, { status: 403 });
  }
  
  if (!prisma) {
    return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const validation = alertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }
    const { indicatorId, targetValue, condition } = validation.data;

    // Optional: Check for existing identical alert
    const existingAlert = await prisma.userAlert.findFirst({
        where: { userId, indicatorId, targetValue, condition }
    });
    if (existingAlert) {
        return NextResponse.json({ error: 'An identical alert already exists.' }, { status: 409 });
    }
    
    // Optional: Limit number of alerts per user tier
    const userAlertCount = await prisma.userAlert.count({ where: { userId } });
    const MAX_ALERTS_PRO = 20; // Example limits
    const MAX_ALERTS_BASIC = 5;
    
    if (userTier === 'pro' && userAlertCount >= MAX_ALERTS_PRO) {
        return NextResponse.json({ error: `Pro plan alert limit (${MAX_ALERTS_PRO}) reached.` }, { status: 403 });
    } else if (userTier === 'basic' && userAlertCount >= MAX_ALERTS_BASIC) {
        return NextResponse.json({ error: `Basic plan alert limit (${MAX_ALERTS_BASIC}) reached.` }, { status: 403 });
    }


    const newAlert = await prisma.userAlert.create({
      data: { userId, indicatorId, targetValue, condition, isEnabled: true },
    });
    return NextResponse.json(newAlert, { status: 201 });
  } catch (error: any) {
    console.error("[API POST /users/alerts] Error:", error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Alert configuration already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const userTier: AppPlanTier | undefined = (session.user as any)?.activePlanTier;

    if (!canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP)) {
        return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    if (!prisma) return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    if (!alertId) return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });

    try {
        const alertToDelete = await prisma.userAlert.findUnique({ where: { id: alertId }});
        if (!alertToDelete || alertToDelete.userId !== userId) {
            return NextResponse.json({ error: 'Alert not found or unauthorized.' }, { status: 404 });
        }
        await prisma.userAlert.delete({ where: { id: alertId }});
        return NextResponse.json({ message: 'Alert removed' }, { status: 200 });
    } catch (error: any) {
        console.error("[API DELETE /users/alerts] Error:", error);
        if (error.code === 'P2025') return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Failed to remove alert' }, { status: 500 });
    }
}

// Add PUT for toggling isEnabled if needed
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    // ... (permission checks) ...

    if (!prisma) return NextResponse.json({ error: 'Database service unavailable.' }, { status: 503 });
    
    try {
        const { alertId, isEnabled } = await request.json();
        if (!alertId || typeof isEnabled !== 'boolean') {
            return NextResponse.json({ error: 'Alert ID and isEnabled flag are required.' }, { status: 400 });
        }

        const alertToUpdate = await prisma.userAlert.findUnique({ where: { id: alertId }});
        if (!alertToUpdate || alertToUpdate.userId !== userId) {
            return NextResponse.json({ error: 'Alert not found or unauthorized.' }, { status: 404 });
        }

        const updatedAlert = await prisma.userAlert.update({
            where: { id: alertId },
            data: { isEnabled }
        });
        return NextResponse.json(updatedAlert, { status: 200 });
    } catch (error) {
        console.error("[API PUT /users/alerts] Error:", error);
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
}