// src/components/NoDbModeBanner.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { DatabaseZap, X } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Assuming you have this

interface NoDbModeBannerProps {
  isActive: boolean; // Prop to control initial visibility based on server env
}

const NO_DB_BANNER_DISMISSED_KEY = 'ecoDashNoDbBannerDismissed_v1';

export default function NoDbModeBanner({ isActive }: NoDbModeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if the mode is active AND the banner hasn't been dismissed by the user
    if (isActive && localStorage.getItem(NO_DB_BANNER_DISMISSED_KEY) !== 'true') {
      setIsVisible(true);
    } else {
      setIsVisible(false); // Ensure it's hidden if not active or already dismissed
    }
  }, [isActive]); // Depend on isActive prop

  const handleDismiss = () => {
    localStorage.setItem(NO_DB_BANNER_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) { // If not active initially or dismissed, or after dismissal
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-2 bg-yellow-100 dark:bg-yellow-800/80 border-t border-yellow-400 dark:border-yellow-600 shadow-md print:hidden">
      <div className="container mx-auto flex items-center justify-between gap-3 max-w-screen-xl">
        <div className="flex items-center gap-2">
          <DatabaseZap className="h-4 w-4 text-yellow-700 dark:text-yellow-300 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Demo Mode:</strong> Database is not connected. Features like user accounts, subscriptions, and saved preferences are using demo data or are disabled.
          </p>
        </div>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDismiss} 
            className="h-7 w-7 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200/50 dark:hover:bg-yellow-700/50 flex-shrink-0"
            aria-label="Dismiss demo mode banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}