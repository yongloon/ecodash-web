// src/components/SubscriptionButton.tsx
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadStripe, Stripe } from '@stripe/stripe-js'; // Import Stripe type
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// --- Load Stripe ---
// It's good practice to call loadStripe outside the component rendering path if the key is static.
// However, to handle the case where the key might be missing and to show an error,
// we can do a check.

let stripePromise: Promise<Stripe | null> | null = null;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (stripePublishableKey) {
  stripePromise = loadStripe(stripePublishableKey);
} else {
  console.error("Stripe Publishable Key is MISSING. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env.local file and restart the server.");
  // stripePromise will remain null, and we can handle this in the component.
}
// --- End Load Stripe ---


interface SubscriptionButtonProps {
  priceId: string | null; // Allow null for free plan or misconfiguration
  planName: string;
  isCurrentPlan?: boolean;
}

export default function SubscriptionButton({ 
    priceId, 
    planName, 
    isCurrentPlan = false, 
}: SubscriptionButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter(); // If needed for other redirects
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!stripePromise) { // Check if Stripe failed to initialize
        alert("Payment system is currently unavailable. Please try again later or contact support.");
        console.error("Stripe Promise is null. Stripe key likely missing.");
        return;
    }

    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user) {
      signIn(undefined, { callbackUrl: window.location.pathname });
      return;
    }

    if (isCurrentPlan || !priceId) return; // Should not happen if button isn't disabled

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }), // priceId comes from props
      });
      const responseData = await response.json();

      if (!response.ok || responseData.error) {
        alert(`Error: ${responseData.error || 'Failed to initiate subscription.'}`);
        setIsLoading(false);
        return;
      }
      
      const { sessionId } = responseData;
      const stripe = await stripePromise; // Get the resolved Stripe instance

      if (stripe && sessionId) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
            console.error("Stripe redirect error:", error);
            alert(`Error redirecting to checkout: ${error.message}`);
            // setIsLoading(false); // Only if redirect fails and user stays on page
        }
        // If successful, user is redirected. setIsLoading(false) might not be hit here.
      } else {
        console.error("Stripe.js not loaded or no session ID received after successful API call.");
        alert("Could not initialize Stripe Checkout. Please try again.");
      }
    } catch (err: any) {
      console.error("Subscription button error:", err);
      alert(`Subscription failed: ${err.message || "An unexpected error occurred. Please try again."}`);
    } finally {
        // Only set isLoading to false if we are certain the user is still on the page
        // If redirectToCheckout is called, this might not be necessary or could cause issues
        // if the component unmounts during the redirect.
        // Consider removing this if redirects are the primary outcome.
        // setIsLoading(false); 
    }
  };

  if (isCurrentPlan) {
    return <Button disabled className="w-full">Current Plan</Button>;
  }
  
  if (!priceId) { // If a paid plan somehow has no priceId due to env var issue
      return <Button disabled className="w-full">Plan Unavailable</Button>
  }

  if (!stripePublishableKey) { // If key was missing from start
      return <Button disabled className="w-full">Payment Unavailable</Button>
  }

  return (
    <Button 
        onClick={handleSubscribe} 
        disabled={isLoading || status === 'loading' || !stripePromise} 
        className="w-full"
    >
      {isLoading 
        ? "Processing..." 
        : (status === "authenticated" ? `Choose ${planName}` : `Login to Choose ${planName}`)}
    </Button>
  );
}