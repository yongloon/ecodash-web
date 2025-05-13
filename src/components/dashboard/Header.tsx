// src/components/dashboard/Header.tsx
"use client"; 

import React from 'react';
import CountrySelector from './CountrySelector';
import { usePathname } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/indicators';
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker';
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogIn, LogOut, Gem, UserCircle, Home } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Import AppPlanTier

export default function Header() {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const currentUser = session?.user as any;
  const userTier: AppPlanTier | undefined = currentUser?.activePlanTier;
  // const userHasActiveSubscription = userTier && userTier !== 'free'; // More direct way to check

  const pathname = usePathname();
  let title = "EcoDash"; // Default title or fallback
  if (pathname === '/') title = "Dashboard Overview";
  else if (pathname.startsWith('/category/')) {
      const slug = pathname.split('/').pop();
      if (slug) {
          const category = getCategoryBySlug(slug);
          title = category ? category.name : "Category";
      }
  } else if (pathname === '/account/profile') {
       title = "My Profile";
  } else if (pathname === '/pricing') {
       title = "Subscription Plans";
  } else if (pathname.startsWith('/pro/')) {
       title = "Pro Tools"; // Example
  }


  return (
    <header className="bg-card text-card-foreground shadow-sm h-auto py-2.5 md:h-16 flex flex-col md:flex-row items-center justify-between px-3 md:px-6 border-b border-border/60 flex-shrink-0 gap-2 md:gap-0">
      <div className="flex-grow md:flex-grow-0 mb-2 md:mb-0">
        {pathname.startsWith("/account/") || pathname.startsWith("/pricing") ? (
             <Link href="/" className="text-xl font-bold text-primary group-hover:opacity-80 transition-opacity">
                EcoDash
             </Link>
        ) : (
            <h1 className="text-md sm:text-lg font-semibold text-foreground text-center md:text-left truncate max-w-xs sm:max-w-sm md:max-w-md">
            {title}
            </h1>
        )}
      </div>
      <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
         {/* Show these only if on dashboard pages */}
         {!pathname.startsWith('/account/') && !pathname.startsWith('/pricing') && !pathname.startsWith('/login') && !pathname.startsWith('/register') && (
            <>
                <DateRangePicker />
                <CountrySelector />
            </>
         )}
         <ThemeToggle />

         {!isLoadingSession && currentUser && userTier && userTier !== 'pro' && userTier !== 'free' /* e.g. basic and not on pricing page */ && pathname !== '/pricing' && (
            <Link href="/pricing" passHref>
                <Button variant="default" size="sm" className="h-9 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground hover:opacity-90 shadow-md">
                    <Gem className="mr-0 sm:mr-2 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Upgrade</span>
                </Button>
            </Link>
         )}
         {/* If free tier and not on pricing, show upgrade */}
          {!isLoadingSession && currentUser && userTier === 'free' && pathname !== '/pricing' && (
            <Link href="/pricing" passHref>
                <Button variant="default" size="sm" className="h-9 bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground hover:opacity-90 shadow-md">
                     <Gem className="mr-0 sm:mr-2 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Go Pro</span>
                </Button>
            </Link>
         )}


         {!isLoadingSession && (
            currentUser ? (
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <Link href="/account/profile" passHref>
                        <Button variant="ghost" size="sm" className="h-9 px-2">
                            <UserCircle className="h-5 w-5" />
                            <span className="text-sm text-muted-foreground hidden md:inline ml-1.5">
                                {currentUser.name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                            </span>
                        </Button>
                    </Link>
                     <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })} className="h-9 w-9" aria-label="Logout">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Logout</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                (pathname !== '/login' && pathname !== '/register') && (
                    <div className="flex items-center space-x-2">
                        {pathname !== '/pricing' && (
                             <Link href="/pricing" passHref>
                                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground">Pricing</Button>
                            </Link>
                        )}
                        <Button variant="outline" size="sm" className="h-9" onClick={() => signIn(undefined, { callbackUrl: pathname.startsWith('/api/auth') || pathname === '/' ? '/dashboard' : pathname })}>
                            <LogIn className="mr-2 h-4 w-4" /> Login
                        </Button>
                    </div>
                )
            )
         )}
      </div>
    </header>
  );
}