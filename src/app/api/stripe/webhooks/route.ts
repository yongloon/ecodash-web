// src/app/api/stripe/webhooks/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers'; // To get Stripe signature

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === 'subscription' && checkoutSession.subscription) {
            const subscriptionId = checkoutSession.subscription as string;
            const customerId = checkoutSession.customer as string;
            const userId = checkoutSession.metadata?.userId;

            if (userId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              await prisma.user.update({
                where: { id: userId },
                data: {
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: customerId,
                  stripePriceId: subscription.items.data[0].price.id,
                  stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                },
              });
            }
          }
          break;
        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription) {
            const subscriptionId = invoice.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
             const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id }});
            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        stripePriceId: subscription.items.data[0].price.id,
                        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                });
            }
          }
          break;
        case 'customer.subscription.deleted':
        case 'customer.subscription.updated': // Handle upgrades, downgrades, cancellations
          const subscriptionEvent = event.data.object as Stripe.Subscription;
          const userToUpdate = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscriptionEvent.id }});
          if (userToUpdate) {
            await prisma.user.update({
              where: { id: userToUpdate.id },
              data: {
                stripeSubscriptionId: subscriptionEvent.status === 'canceled' ? null : subscriptionEvent.id,
                stripePriceId: subscriptionEvent.status === 'canceled' ? null : subscriptionEvent.items.data[0].price.id,
                stripeCurrentPeriodEnd: subscriptionEvent.status === 'canceled' ? null : new Date(subscriptionEvent.current_period_end * 1000),
              },
            });
          }
          break;
        default:
          console.warn(`🤷‍♀️ Unhandled relevant event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handler error:', error);
      return NextResponse.json({ error: 'Webhook handler failed.' }, { status: 500 });
    }
  } else {
    console.log(`🔔 Received ignorable event: ${event.type}`);
  }
  return NextResponse.json({ received: true });
}