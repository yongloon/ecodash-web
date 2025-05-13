// src/app/subscribe/success/page.tsx
"use client"; // For potential client-side interactions or hooks like useSearchParams

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, PartyPopper } from 'lucide-react';
import { useSearchParams } from 'next/navigation'; // To read session_id if needed
// import { useSession } from 'next-auth/react'; // If you want to greet user by name

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get('session_id');
  // const { data: session } = useSession();
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // Example if fetching details
  const [planName, setPlanName] = useState<string | null>(null);

  // Optional: Fetch checkout session details to display more info
  // This is more for UX confirmation; webhooks are the source of truth for DB updates.
  useEffect(() => {
    if (stripeSessionId) {
      // setIsLoadingDetails(true);
      // fetch(`/api/stripe/get-checkout-session?id=${stripeSessionId}`)
      //   .then(res => res.json())
      //   .then(data => {
      //     if (data.planName) setPlanName(data.planName); // Assuming API returns planName
      //     setIsLoadingDetails(false);
      //   })
      //   .catch(() => setIsLoadingDetails(false));
      console.log("Stripe Checkout Session ID:", stripeSessionId); // For debugging
    }
  }, [stripeSessionId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4 text-center">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="items-center">
          <PartyPopper className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-bold text-foreground">Subscription Successful!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Welcome aboard! Your access to premium features has been activated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingDetails ? (
            <p>Loading your plan details...</p>
          ) : planName ? (
            <p className="text-lg">
              You are now subscribed to the <span className="font-semibold text-primary">{planName}</span> plan.
            </p>
          ) : (
            <p className="text-lg">
              You can now enjoy all the benefits of your new plan.
            </p>
          )}
          
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
            <h3 className="text-md font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2"/> What's Next?
            </h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 text-left">
                <li>Explore your <Link href="/dashboard" className="text-primary hover:underline font-medium">Dashboard</Link> to see new features.</li>
                <li>Manage your subscription anytime from your <Link href="/account/profile" className="text-primary hover:underline font-medium">Profile</Link>.</li>
                <li>Look out for a welcome email with more tips!</li>
            </ul>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-6">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full bg-primary hover:bg-primary/90">Go to Dashboard</Button>
          </Link>
          <Link href="/account/profile" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full">View My Profile</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}