// src/app/api/stripe/create-checkout-session/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next'; // If using NextAuth to get user
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Your authOptions
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions); // Get current user session
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = (session.user as any).id;

  try {
    const { priceId, quantity = 1 } = await request.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
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
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`, // Or a dedicated success page
      cancel_url: `${appUrl}/pricing`, // Or wherever your plans are
      metadata: { userId: user.id },
    });

    return NextResponse.json({ sessionId: stripeSession.id });

  } catch (error: any) {
    console.error('Stripe Checkout Session Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 });
  }
}