// src/app/pricing/page.tsx
import React from 'react';
import SubscriptionButton from '@/components/SubscriptionButton'; // Ensure this path is correct
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button'; // Import Button if used directly (like for Login button)
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route'; // Ensure this path is correct
// import prisma from '@/lib/prisma'; // Keep commented out for "no DB" mode for demo users

// Define your plans here
// IMPORTANT: Replace placeholder Price IDs with your actual Stripe Price IDs
// Ensure environment variables are prefixed with NEXT_PUBLIC_ if SubscriptionButton needs them client-side for any reason (though typically it just passes the ID to the backend)
const plans = [
  {
    name: 'Basic',
    priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID || 'price_basic_placeholder_id', // Fallback to a string
    priceMonthly: '$10',
    description: 'Essential tools for tracking the economy.',
    features: [
      'Access to 20+ core economic indicators',
      'Standard chart visualizations',
      'Email support',
      'Data updated daily/weekly (as available)',
      'Last 5 years of historical data',
    ],
    cta: 'Choose Basic',
  },
  {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID || 'price_pro_placeholder_id', // Fallback to a string
    priceMonthly: '$25',
    description: 'Advanced insights and tools for serious analysts.',
    features: [
      'All Basic features',
      'Access to all 50+ indicators',
      'Advanced data analysis tools (Moving Averages, Trend Lines)',
      'Extended historical data access (up to 20+ years)',
      'Data export (CSV)',
      'Recession shading on charts',
      'Priority email support',
      'Early access to new indicators & features',
    ],
    cta: 'Choose Pro',
    highlighted: true,
  },
  // Example: Free tier (if you have one, doesn't need a Stripe Price ID for subscribing)
  // {
  //   name: 'Free',
  //   priceId: null, // No Stripe Price ID needed for a free tier button
  //   priceMonthly: '$0',
  //   description: 'Get started with core features.',
  //   features: [
  //     'Access to 5 key economic indicators',
  //     'Basic chart visualizations',
  //     'Community support',
  //   ],
  //   cta: 'Get Started',
  // },
];

export default async function PricingPage() {
  // --- Debugging: Log the plans array on the server-side ---
  console.log("[PricingPage] Plans defined:", JSON.stringify(plans, null, 2));
  if (!process.env.STRIPE_BASIC_PLAN_PRICE_ID) {
    console.warn("[PricingPage] STRIPE_BASIC_PLAN_PRICE_ID environment variable is not set. Using placeholder.");
  }
  if (!process.env.STRIPE_PRO_PLAN_PRICE_ID) {
    console.warn("[PricingPage] STRIPE_PRO_PLAN_PRICE_ID environment variable is not set. Using placeholder.");
  }
  // --- End Debugging ---

  const session = await getServerSession(authOptions);
  let userCurrentPriceId: string | null = null;
  let userHasActiveSubscription = false;

  // For "no DB" mode with demo users, we assume they have no active subscription
  // because we can't check the database for it.
  if (session?.user) {
    // In a DB-connected scenario, you'd fetch from Prisma here:
    // const userId = (session.user as any).id;
    // if (userId && process.env.DATABASE_URL) { // Only try Prisma if DB_URL suggests it's configured
    //   try {
    //     const userWithSubscription = await prisma.user.findUnique({
    //       where: { id: userId },
    //       select: { stripePriceId: true, stripeCurrentPeriodEnd: true }
    //     });
    //     if (userWithSubscription?.stripePriceId && 
    //         userWithSubscription.stripeCurrentPeriodEnd && 
    //         userWithSubscription.stripeCurrentPeriodEnd > new Date()) {
    //       userCurrentPriceId = userWithSubscription.stripePriceId;
    //       userHasActiveSubscription = true;
    //     }
    //   } catch (e) {
    //     console.error("[PricingPage] Error fetching user subscription from DB:", e);
    //     // Fallback to no active subscription if DB query fails
    //   }
    // }
    // For demo purposes, you could simulate a subscription based on a demo user's property
    if ((session.user as any).email === 'admin@example.com') { // Example: Make admin a "Pro" user for demo
        // userHasActiveSubscription = true;
        // userCurrentPriceId = plans.find(p => p.name === 'Pro')?.priceId || null;
        // console.log("[PricingPage] Demo admin user, simulating Pro subscription status.");
    } else {
        console.log(`[PricingPage] User ${session.user.email} is logged in. In current 'no DB check' mode, assuming no active subscription unless explicitly simulated.`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-4 sm:py-6 border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            EcoDash
          </Link>
          <div>
            {session?.user ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">
                  {session.user.name || session.user.email}
                </span>
                 <Link href="/dashboard" passHref> {/* Assuming your dashboard is at / or /dashboard */}
                    <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful economic insights. Simple, transparent pricing.
          </p>
        </section>

        {plans.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => {
              // --- Debugging: Log each plan being mapped ---
              console.log("[PricingPage] Rendering plan:", plan.name, "Price ID:", plan.priceId);
              // --- End Debugging ---
              if (!plan.priceId && plan.name !== 'Free') { // Skip if priceId is missing for a non-Free plan
                  console.warn(`[PricingPage] Plan "${plan.name}" is missing a priceId and is not named 'Free'. It will not be rendered with a subscription button.`);
                  // You might want to render it differently or not at all
                  // return null; 
              }

              return (
                <Card
                  key={plan.name}
                  className={`flex flex-col overflow-hidden ${
                    plan.highlighted ? 'border-primary ring-2 ring-primary shadow-xl' : 'border-border'
                  }`}
                >
                  <CardHeader className="pb-4 bg-muted/30">
                    <CardTitle className="text-xl sm:text-2xl font-semibold">{plan.name}</CardTitle>
                    {plan.description && <CardDescription className="text-sm text-muted-foreground pt-1">{plan.description}</CardDescription>}
                    <div className="text-3xl sm:text-4xl font-bold text-primary pt-3">
                      {plan.priceMonthly}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow pt-6 space-y-3">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto pt-6 border-t">
                    {plan.name === 'Free' ? (
                         <Link href="/dashboard" className="w-full"> {/* Or to /register if needed */}
                            <Button variant="outline" className="w-full">{plan.cta || 'Get Started'}</Button>
                         </Link>
                    ) : plan.priceId ? (
                        <SubscriptionButton 
                            priceId={plan.priceId} 
                            planName={plan.name} 
                            isCurrentPlan={userHasActiveSubscription && userCurrentPriceId === plan.priceId}
                        />
                    ) : (
                        <Button disabled className="w-full">Not Available</Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </section>
        ) : (
            <section className="text-center py-10">
                <p className="text-muted-foreground">No subscription plans are currently configured. Please check back later.</p>
            </section>
        )}
        
        <section className="text-center mt-16">
            <p className="text-muted-foreground">
                Need a custom solution or have questions? <Link href="/contact" className="text-primary hover:underline">Contact us</Link>.
            </p>
            {/* Link back to dashboard if logged in */}
            {session?.user && (
                <p className="mt-4">
                    <Link href="/dashboard" className="text-sm text-primary hover:underline">
                        ← Back to Dashboard
                    </Link>
                </p>
            )}
        </section>
      </main>
    </div>
  );
}