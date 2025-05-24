// src/components/NoDbModeBanner.tsx
"use client";
import React from 'react';
import { DatabaseZap } from 'lucide-react';

interface NoDbModeBannerProps {
  isActive: boolean;
}

export default function NoDbModeBanner({ isActive }: NoDbModeBannerProps) {
  if (!isActive) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] p-2 bg-yellow-100 dark:bg-yellow-900/70 border-t border-yellow-400 dark:border-yellow-600 shadow-md print:hidden text-center">
      <div className="container mx-auto flex items-center justify-center gap-2 max-w-screen-xl">
        <DatabaseZap className="h-4 w-4 text-yellow-700 dark:text-yellow-300 flex-shrink-0" />
        <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Demo Mode:</strong> Database is not connected. Features like user accounts, subscriptions, and saved preferences are using demo data or are disabled.
        </p>
      </div>
    </div>
  );
}