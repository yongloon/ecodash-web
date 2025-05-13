// src/app/api/stripe/create-portal-link/route.ts
import { stripe } from '@/lib/stripe'; // Your initialized Stripe client
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Your NextAuth options
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized: User not logged in.' }, { status: 401 });
  }
  
  const userId = (session.user as any).id;
  if (!userId) {
    console.error("[Create Portal Link] User ID not found in session:", session.user);
    return NextResponse.json({ error: 'Unauthorized: User session is invalid.' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    });

    if (!user) {
        console.error(`[Create Portal Link] User not found in DB for ID: ${userId}`);
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      console.log(`[Create Portal Link] User ${userId} does not have a Stripe Customer ID.`);
      // Instead of error, maybe redirect to pricing or show a message.
      // For now, this indicates they haven't subscribed via your current system.
      return NextResponse.json({ error: 'No Stripe customer record found for this user. Please subscribe to a plan first.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
        console.error("[Create Portal Link] NEXT_PUBLIC_APP_URL is not set.");
        return NextResponse.json({ error: 'Application configuration error.' }, { status: 500 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/account/profile`,
    });

    return NextResponse.json({ url: portalSession.url });

  } catch (error: any) {
    console.error('[Create Portal Link] Error creating Stripe portal session:', error);
    return NextResponse.json({ error: error.message || 'Failed to create portal link. Please try again.' }, { status: 500 });
  }
}