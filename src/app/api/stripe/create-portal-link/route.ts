// src/app/api/stripe/create-portal-link/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma'; // Now PrismaClient | null
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized: User not logged in.' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized: User session is invalid.' }, { status: 401 });
  }

  try {
    // --- PRISMA CHECK ---
    if (!prisma) {
      console.error("[API Create Portal Link] Database not configured. Prisma instance is null.");
      return NextResponse.json(
        { error: "Subscription management is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    // --- END PRISMA CHECK ---

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    });

    if (!user) {
        console.error(`[API Create Portal Link] User not found in DB for ID: ${userId}`);
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      console.log(`[API Create Portal Link] User ${userId} does not have a Stripe Customer ID.`);
      return NextResponse.json({ error: 'No Stripe customer record found. Please subscribe first.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        console.error("[API Create Portal Link] NEXT_PUBLIC_APP_URL is not set.");
        return NextResponse.json({ error: 'Application configuration error.' }, { status: 500 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/account/profile`,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    console.error('[API Create Portal Link] Error creating Stripe portal session:', error);
    if ((error as any).name === 'PrismaClientInitializationError' || (error as any).message?.includes("prisma")) {
        return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create portal link.' }, { status: 500 });
  }
}