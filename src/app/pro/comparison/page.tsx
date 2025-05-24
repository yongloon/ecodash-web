// src/app/pro/comparison/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppPlanTier } from "@/app/api/auth/[...nextauth]/route";
import React, { useEffect } from "react";
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions'; // <<< UPDATED IMPORT
import { Loader2 } from "lucide-react"; // For loading state


export default function IndicatorComparisonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  
  const canAccessComparison = canUserAccessFeature(userTier, FEATURE_KEYS.INDICATOR_COMPARISON);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/pro/comparison");
    } 
    // No explicit redirect for non-pro users here, page content handles it.
  }, [status, userTier, router]);

  if (status === "loading") {
    return (
        <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying access...</p>
        </div>
    );
  }
  if (status === "unauthenticated") {
     // This state should ideally be brief due to the useEffect redirect.
    return (
        <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
             <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  if (!canAccessComparison) {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Pro Feature: Indicator Comparison</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          This powerful tool allows you to compare multiple economic indicators side-by-side.
          Upgrade to Pro to unlock this feature and gain deeper market insights.
        </p>
        <Link href="/pricing">
          <Button size="lg">Upgrade to Pro</Button>
        </Link>
         <Link href="/dashboard" className="mt-4">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // --- Actual Comparison Tool UI Would Go Here ---
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
        Indicator Comparison Tool (PRO)
      </h1>
      <div className="p-8 border border-dashed rounded-lg bg-muted/20 text-center">
        <p className="text-muted-foreground">
          Indicator comparison tool UI and functionality will be built here.
        </p>
        <p className="text-sm mt-2">
          (Select indicators, choose date ranges, view combined charts with dual axes, etc.)
        </p>
      </div>
    </div>
  );
}