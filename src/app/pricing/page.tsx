// src/app/pricing/page.tsx
import React from 'react';
import SubscriptionButton from '@/components/SubscriptionButton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { CheckCircle, ShieldQuestion, Zap } from 'lucide-react'; // Added Zap for Pro
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, APP_PLANS, AppPlanTier } from '../api/auth/[...nextauth]/route'; // Import APP_PLANS and AppPlanTier

// Define your plans here, ensure 'tier' matches keys in APP_PLANS
const pagePlans = [
  {
    name: APP_PLANS.FREE.name,
    tier: APP_PLANS.FREE.tier,
    priceId: APP_PLANS.FREE.priceId,
    priceMonthly: '$0',
    description: 'Get started with essential economic indicators.',
    features: [
      'Access to 10 key economic indicators',
      'Basic chart visualizations',
      'Standard historical data (last 2 years)',
      'Community support',
    ],
    cta: 'Get Started',
    icon: ShieldQuestion,
  },
  {
    name: APP_PLANS.BASIC.name,
    tier: APP_PLANS.BASIC.tier,
    priceId: APP_PLANS.BASIC.priceId || 'price_basic_placeholder_id', // Fallback if env var missing
    priceMonthly: '$10', // You might want to fetch this from Stripe for accuracy
    description: 'More indicators and standard analysis tools.',
    features: [
      'Access to 25+ core economic indicators',
      'Recession shading on charts',
      'Standard Moving Averages',
      'Email support',
      'Last 5 years of historical data',
    ],
    cta: 'Choose Basic',
    icon: CheckCircle,
  },
  {
    name: APP_PLANS.PRO.name,
    tier: APP_PLANS.PRO.tier,
    priceId: APP_PLANS.PRO.priceId || 'price_pro_placeholder_id', // Fallback
    priceMonthly: '$25', // You might want to fetch this from Stripe
    description: 'Full access to all data and advanced analytical tools.',
    features: [
      'All Basic features',
      'Access to all 70+ indicators',
      'Advanced Moving Averages & Trend Lines',
      'Indicator Comparison Mode',
      'Full historical data access',
      'Data export (CSV, Images)',
      'Priority email support',
    ],
    cta: 'Choose Pro',
    highlighted: true,
    icon: Zap,
  },
];

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const currentUserTier: AppPlanTier = userSessionData?.activePlanTier || 'free';

  console.log(`[PricingPage] Current user tier: ${currentUserTier}`);
  pagePlans.forEach(p => {
    if (!p.priceId && p.tier !== 'free') {
        console.warn(`[PricingPage] Plan "${p.name}" is missing a Stripe Price ID in .env.local or APP_PLANS config.`);
    }
  });

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
                 <Link href="/dashboard" passHref> {/* Assuming dashboard is at / or /dashboard */}
                    <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <Link href="/login?callbackUrl=/pricing">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Flexible Plans for Every Analyst
          </h1>
          <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that best fits your needs to unlock powerful economic insights.
          </p>
        </section>

        {pagePlans.length > 0 ? (
            <section className={`grid grid-cols-1 md:grid-cols-${pagePlans.length > 2 ? '2' : pagePlans.length} lg:grid-cols-${pagePlans.length > 2 ? '3' : pagePlans.length} gap-6 lg:gap-8 max-w-6xl mx-auto`}>
            {pagePlans.map((plan) => {
              const PlanIcon = plan.icon || CheckCircle;
              const isCurrentPlan = currentUserTier === plan.tier;

              return (
                <Card
                  key={plan.name}
                  className={`flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    plan.highlighted ? 'border-primary ring-2 ring-primary shadow-xl scale-100 md:scale-105' : 'border-border'
                  } ${isCurrentPlan ? 'border-green-500 ring-2 ring-green-500' : '' }`}
                >
                  <CardHeader className="pb-4 bg-card"> {/* Changed background */}
                    {plan.highlighted && (
                        <div className="text-xs uppercase font-semibold text-primary tracking-wider mb-2 text-center">Most Popular</div>
                    )}
                    <CardTitle className="text-xl sm:text-2xl font-semibold text-center">{plan.name}</CardTitle>
                    <div className="text-3xl sm:text-4xl font-bold text-primary pt-3 text-center">
                      {plan.priceMonthly}
                      {plan.priceMonthly !== '$0' && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                    </div>
                    {plan.description && <CardDescription className="text-sm text-muted-foreground pt-2 text-center h-12">{plan.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-grow pt-6 space-y-3">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <PlanIcon className={`h-4 w-4 ${plan.name === 'Free' ? 'text-muted-foreground/70' : 'text-green-500'} mr-2 mt-0.5 flex-shrink-0`} />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="mt-auto pt-6 border-t bg-muted/20">
                    {isCurrentPlan ? (
                        <Button disabled className="w-full bg-green-600 hover:bg-green-700 text-white">Current Plan</Button>
                    ) : plan.tier === 'free' ? (
                         <Link href={session?.user ? "/dashboard" : "/register"} className="w-full">
                            <Button variant="outline" className="w-full">{session?.user ? 'Go to Dashboard' : plan.cta || 'Get Started'}</Button>
                         </Link>
                    ) : plan.priceId ? (
                        <SubscriptionButton 
                            priceId={plan.priceId} 
                            planName={plan.name}
                        />
                    ) : ( // Fallback for paid plans with missing priceId (shouldn't happen with placeholders)
                        <Button disabled className="w-full">Configuration Error</Button>
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
        
        <section className="text-center mt-16 text-sm">
            {/* ... Contact us / Back to Dashboard links ... */}
        </section>
      </main>
    </div>
  );
}