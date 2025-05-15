// src/app/api/stripe/webhooks/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma'; // Now PrismaClient | null
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { Resend } from 'resend';
import WelcomeSubscriberEmail from '@/emails/WelcomeSubscriberEmail';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const appPlansForWebhook = [
  { priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID, name: 'Basic' },
  { priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID, name: 'Pro' },
];

const relevantEvents = new Set([
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // 'customer.subscription.trial_will_end', // If you use trials
]);

export async function POST(request: Request) {
  // --- PRISMA CHECK (Early, as most events will interact with DB) ---
  if (!prisma) {
    console.error("[API Stripe Webhook] Database not configured. Prisma instance is null. Cannot process webhook fully.");
    // Still acknowledge the webhook to Stripe, but log that DB operations will be skipped.
    // Stripe expects a 2xx response quickly.
    return NextResponse.json({ received: true, warning: "Database not configured, some webhook actions skipped." }, { status: 200 });
  }
  // --- END PRISMA CHECK ---

  const body = await request.text();
  const sig = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig || !webhookSecret) {
    console.error("[API Stripe Webhook] Missing signature or webhook secret.");
    return NextResponse.json({ error: 'Webhook secret or signature not configured.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[API Stripe Webhook] Error constructing event: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[API Stripe Webhook] Received event: ${event.type}`);

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === 'subscription' && checkoutSession.payment_status === 'paid') {
            const subscriptionId = checkoutSession.subscription as string;
            const customerId = checkoutSession.customer as string;
            const userId = checkoutSession.metadata?.userId;
            const priceId = checkoutSession.metadata?.priceId; // Assuming you stored this

            if (userId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: customerId,
                  stripePriceId: priceId || subscription.items.data[0].price.id, // Use metadata if available
                  stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                },
              });

              if (resend && updatedUser.email) {
                const currentPlan = appPlansForWebhook.find(p => p.priceId === updatedUser.stripePriceId);
                try {
                  await resend.emails.send({
                    from: process.env.EMAIL_FROM_ADDRESS || 'EcoDash Welcome <welcome@yourdomain.com>',
                    to: [updatedUser.email],
                    subject: `Welcome to EcoDash ${currentPlan?.name || 'Pro'}!`,
                    react: WelcomeSubscriberEmail({ userName: updatedUser.name, planName: currentPlan?.name }),
                  });
                  console.log(`[API Stripe Webhook] Welcome email sent to ${updatedUser.email}`);
                } catch (emailError) {
                  console.error("[API Stripe Webhook] Error sending welcome email:", emailError);
                }
              }
            } else {
                console.warn("[API Stripe Webhook] checkout.session.completed: Missing userId in metadata.", checkoutSession.metadata);
            }
          }
          break;

        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.subscription && (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_update')) {
            const subscriptionId = invoice.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userToUpdate = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id }});
            if (userToUpdate) {
                await prisma.user.update({
                    where: { id: userToUpdate.id },
                    data: {
                        stripePriceId: subscription.items.data[0].price.id,
                        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                    },
                });
                console.log(`[API Stripe Webhook] Subscription renewed/updated in DB for user ${userToUpdate.id}`);
            } else {
                 console.warn(`[API Stripe Webhook] invoice.payment_succeeded: User not found for subscription ID ${subscriptionId}`);
            }
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': // Also handles cancellations that become 'deleted' at period end
          const subscriptionEvent = event.data.object as Stripe.Subscription;
          const userForSubUpdate = await prisma.user.findFirst({
            where: { stripeSubscriptionId: subscriptionEvent.id },
          });
          if (userForSubUpdate) {
            if (event.type === 'customer.subscription.deleted' || subscriptionEvent.status === 'canceled') {
              await prisma.user.update({
                where: { id: userForSubUpdate.id },
                data: {
                  stripeSubscriptionId: null, // Mark as inactive
                  stripePriceId: null,
                  stripeCurrentPeriodEnd: null, // Or keep old period end if you want to show "active until X"
                },
              });
              console.log(`[API Stripe Webhook] Subscription ${subscriptionEvent.id} marked as inactive/deleted for user ${userForSubUpdate.id}`);
            } else { // Updated (e.g. plan change, payment method update)
              await prisma.user.update({
                where: { id: userForSubUpdate.id },
                data: {
                  stripePriceId: subscriptionEvent.items.data[0].price.id,
                  stripeCurrentPeriodEnd: new Date(subscriptionEvent.current_period_end * 1000),
                  // stripeSubscriptionId: subscriptionEvent.id, // Should already be correct
                },
              });
               console.log(`[API Stripe Webhook] Subscription ${subscriptionEvent.id} updated for user ${userForSubUpdate.id}`);
            }
          } else {
            console.warn(`[API Stripe Webhook] ${event.type}: User not found for subscription ID ${subscriptionEvent.id}`);
          }
          break;
        // Add other cases as needed e.g. invoice.payment_failed
      }
    } catch (error) {
      console.error(`[API Stripe Webhook] Error processing event ${event.type}:`, error);
      // Return 200 to Stripe to acknowledge receipt, even if processing fails, to prevent retries for this specific error.
      // Log the error for investigation.
      return NextResponse.json({ error: 'Webhook handler failed', details: (error as Error).message }, { status: 200 });
    }
  }
  return NextResponse.json({ received: true });
}