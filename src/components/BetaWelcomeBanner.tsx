// File: src/components/BetaWelcomeBanner.tsx
// NEW FILE
"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link'; // Import Link

const BETA_BANNER_DISMISSED_KEY = 'ecoDashBetaBannerDismissed_v1.1'; // Increment version if you want to show it again after updates

export default function BetaWelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(BETA_BANNER_DISMISSED_KEY) !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BETA_BANNER_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-3 bg-amber-100 dark:bg-amber-900/60 border-t-2 border-amber-400 dark:border-amber-600 shadow-lg print:hidden">
      <div className="container mx-auto flex items-center justify-between gap-3 max-w-screen-xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
            Welcome to the <strong>EcoDash Beta!</strong> This is a test version. Features may change, and data is for informational purposes only (not financial advice). Your{' '}
            <Link href="/contact?subject=EcoDash%20Beta%20Feedback" className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-200">
              feedback
            </Link>
            {' '}is valuable!
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDismiss} className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/60 flex-shrink-0">
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}