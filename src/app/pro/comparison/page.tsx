// src/app/pro/comparison/page.tsx
"use client"; // If it will have client-side interactions for selecting indicators

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppPlanTier } from "@/app/api/auth/[...nextauth]/route"; // Adjust path if needed
import React, { useEffect } from "react";


export default function IndicatorComparisonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/pro/comparison");
    } else if (status === "authenticated" && userTier !== 'pro') {
      // Redirect non-pro users or show an upgrade message
      // For now, let's just show an upgrade message, but redirecting might be better
      // router.replace("/pricing?feature=comparison");
    }
  }, [status, userTier, router]);

  if (status === "loading") {
    return <div className="container mx-auto p-8 text-center">Loading access rights...</div>;
  }
  if (status === "unauthenticated") {
    return <div className="container mx-auto p-8 text-center">Redirecting to login...</div>;
  }

  if (userTier !== 'pro') {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Pro Feature: Indicator Comparison</h1>
        <p className="text-muted-foreground mb-6">
          This powerful tool allows you to compare multiple economic indicators side-by-side.
          Upgrade to Pro to unlock this feature.
        </p>
        <Link href="/pricing">
          <Button size="lg">Upgrade to Pro</Button>
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
          Comparison tool UI and functionality will be built here.
        </p>
        <p className="text-sm mt-2">
          (Select indicators, choose date ranges, view combined charts with dual axes, etc.)
        </p>
      </div>
      {/* Add components for selecting indicators, date range for comparison, chart display area */}
    </div>
  );
}