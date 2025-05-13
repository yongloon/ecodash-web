// src/app/api/stripe/webhooks/route.ts
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { Resend } from 'resend'; // IMPORT RESEND
import WelcomeSubscriberEmail from '@/emails/WelcomeSubscriberEmail'; // IMPORT EMAIL TEMPLATE

const resend = new Resend(process.env.RESEND_API_KEY); // Initialize Resend

const appPlansForWebhook = [ // Keep this in sync with your actual plans
  { priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID, name: 'Basic' },
  { priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID, name: 'Pro' },
];

const relevantEvents = new Set([ /* ... same as before ... */ ]);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) { /* ... error handling ... */ }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          if (checkoutSession.mode === 'subscription' && checkoutSession.payment_status === 'paid') {
            const subscriptionId = checkoutSession.subscription as string;
            const customerId = checkoutSession.customer as string;
            const userId = checkoutSession.metadata?.userId;

            if (userId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const updatedUser = await prisma.user.update({ // Capture updated user
                where: { id: userId },
                data: {
                  stripeSubscriptionId: subscription.id,
                  stripeCustomerId: customerId, // Ensure customerId is also updated/set here
                  stripePriceId: subscription.items.data[0].price.id,
                  stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                },
              });

              // --- SEND WELCOME EMAIL ---
              if (updatedUser.email) {
                const currentPlan = appPlansForWebhook.find(p => p.priceId === updatedUser.stripePriceId);
                try {
                  await resend.emails.send({
                    from: process.env.EMAIL_FROM_ADDRESS || 'EcoDash Welcome <welcome@yourdomain.com>',
                    to: [updatedUser.email],
                    subject: `Welcome to EcoDash ${currentPlan?.name || 'Pro'}!`,
                    react: WelcomeSubscriberEmail({ userName: updatedUser.name, planName: currentPlan?.name }),
                  });
                  console.log(`Welcome email sent to ${updatedUser.email} for plan ${currentPlan?.name}`);
                } catch (emailError) {
                  console.error("Error sending welcome email:", emailError);
                }
              }
              // --- END SEND WELCOME EMAIL ---
            }
          }
          break;
        // ... other cases like invoice.payment_succeeded, customer.subscription.updated/deleted ...
        case 'invoice.payment_succeeded':
              const invoice = event.data.object as Stripe.Invoice;
              if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') { // For renewals
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
                    console.log(`Subscription renewed in DB for user ${userToUpdate.id}`);
                }
              }
              break;
        // ...
      }
    } catch (error) { /* ... */ }
  }
  return NextResponse.json({ received: true });
}