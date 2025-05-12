// src/app/pricing/page.tsx
import React from 'react';
import SubscriptionButton from '@/components/SubscriptionButton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button'; // <--- ADD THIS IMPORT

// Define your plans here - these Price IDs come from your Stripe Dashboard
const plans = [
  {
    name: 'Basic',
    priceId: process.env.STRIPE_BASIC_PLAN_PRICE_ID || 'YOUR_STRIPE_BASIC_PLAN_PRICE_ID_FALLBACK',
    priceMonthly: '$10',
    features: [
      'Access to all core economic indicators',
      'Standard chart visualizations',
      'Email support',
      'Limited historical data access (e.g., last 5 years)',
    ],
    cta: 'Choose Basic',
  },
  {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PLAN_PRICE_ID || 'YOUR_STRIPE_PRO_PLAN_PRICE_ID_FALLBACK',
    priceMonthly: '$25',
    features: [
      'All Basic features',
      'Advanced data analysis tools (Moving Averages, Trend Lines)',
      'Extended historical data access (e.g., last 20 years)',
      'Data export (CSV)',
      'Priority email support',
      'Early access to new indicators',
    ],
    cta: 'Choose Pro',
    highlighted: true,
  },
];

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  let userCurrentPriceId: string | null = null;

  if (session?.user) {
    const userId = (session.user as any).id;
    if (userId) {
      const userWithSubscription = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripePriceId: true, stripeCurrentPeriodEnd: true }
      });
      if (userWithSubscription?.stripePriceId && 
          userWithSubscription.stripeCurrentPeriodEnd && 
          userWithSubscription.stripeCurrentPeriodEnd > new Date()) {
        userCurrentPriceId = userWithSubscription.stripePriceId;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 border-b">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            EcoDash
          </Link>
          <div>
            {session?.user ? (
              <span className="text-sm text-muted-foreground">Logged in as {session.user.name || session.user.email}</span>
            ) : (
              <Link href="/login">
                {/* This is where the error was, Button is now imported */}
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock powerful economic insights. Simple, transparent pricing.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${
                plan.highlighted ? 'border-primary ring-2 ring-primary shadow-xl' : 'border-border'
              }`}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-primary pt-2">
                  {plan.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto pt-6">
                <SubscriptionButton 
                  priceId={plan.priceId} 
                  planName={plan.name} 
                  isCurrentPlan={userCurrentPriceId === plan.priceId}
                />
              </CardFooter>
            </Card>
          ))}
        </section>
        
        <section className="text-center mt-16">
            <p className="text-muted-foreground">
                Need a custom solution or have questions? <Link href="/contact" className="text-primary hover:underline">Contact us</Link>.
            </p>
        </section>
      </main>
    </div>
  );
}