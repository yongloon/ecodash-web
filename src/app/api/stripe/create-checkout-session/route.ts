// src/app/api/stripe/create-checkout-session/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma'; // Now PrismaClient | null
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized: User not logged in.' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    // --- ADD THIS CHECK ---
    if (!prisma) {
      console.error("[API Create Checkout] Database not configured. Prisma instance is null.");
      return NextResponse.json(
        { error: "Subscription service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    // --- END CHECK ---

    const { priceId, quantity = 1 } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const stripeSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      line_items: [{ price: priceId, quantity }],
      mode: 'subscription',
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: user.id, priceId: priceId }, // Store priceId for webhook
    });

    return NextResponse.json({ sessionId: stripeSession.id });

  } catch (error: any) {
    console.error('[API Create Checkout] Error:', error);
    if ((error as any).message?.includes("PrismaClientInitializationError")) {
        return NextResponse.json({ error: "Database service unavailable for checkout." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create checkout session.' }, { status: 500 });
  }
}