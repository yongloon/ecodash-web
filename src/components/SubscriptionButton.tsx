// src/components/SubscriptionButton.tsx
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';
import { useSession, signIn } from 'next-auth/react'; // Import signIn
import { useRouter } from 'next/navigation'; // To potentially redirect to login

// Ensure this environment variable is prefixed with NEXT_PUBLIC_
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionButtonProps {
  priceId: string;
  planName: string;
  // Optional: if you want to pass the user's current plan to disable the button
  isCurrentPlan?: boolean; 
  isSubscribedToOtherPlan?: boolean; // If user is subscribed to a different plan
}

export default function SubscriptionButton({ 
    priceId, 
    planName, 
    isCurrentPlan = false, 
    isSubscribedToOtherPlan = false 
}: SubscriptionButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (status === "loading") return; // Don't do anything if session is still loading

    if (status !== "authenticated" || !session?.user) {
      // Option 1: Redirect to login, then user comes back to pricing (more complex returnTo logic)
      // signIn('google', { callbackUrl: router.asPath }); // or credentials
      // router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      
      // Option 2: Simpler, just use NextAuth's default signIn which often takes them to login then redirects back
      signIn(undefined, { callbackUrl: window.location.pathname }); // Prompt to login, then return to pricing page
      return;
    }

    if (isCurrentPlan) return; // Already subscribed to this plan

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const responseData = await response.json(); // Always parse JSON

      if (!response.ok || responseData.error) {
        alert(`Error: ${responseData.error || 'Failed to initiate subscription.'}`);
        setIsLoading(false);
        return;
      }
      
      const { sessionId } = responseData;
      const stripe = await stripePromise;
      if (stripe && sessionId) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
            console.error("Stripe redirect error:", error);
            alert(`Error redirecting to checkout: ${error.message}`);
            setIsLoading(false);
        }
        // If redirectToCheckout is successful, the user is navigated away.
        // setIsLoading(false) might not be hit if navigation is successful.
      } else {
        console.error("Stripe.js not loaded or no session ID received.");
        alert("Could not initialize Stripe Checkout.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Subscription button error:", err);
      alert(`Subscription failed: ${err.message || "Please try again."}`);
      setIsLoading(false);
    }
    // setIsLoading(false); // This might be set too early if redirect occurs.
  };

  if (isCurrentPlan) {
    return <Button disabled className="w-full">Current Plan</Button>;
  }
  
  // If user is subscribed to another plan, you might want different CTA
  // e.g., "Switch to Pro" or disable if downgrading isn't supported via simple checkout
  // For now, we'll allow them to click, Stripe portal would handle changes.

  return (
    <Button 
        onClick={handleSubscribe} 
        disabled={isLoading || status === 'loading'} 
        className="w-full"
    >
      {isLoading 
        ? "Processing..." 
        : (status === "authenticated" ? `Subscribe to ${planName}` : `Login to Subscribe`)}
    </Button>
  );
}