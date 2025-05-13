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
import { LogIn, LogOut, Gem, UserCircle } from 'lucide-react'; // Ensure UserCircle is imported
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Header() {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const currentUser = session?.user as any; // Cast to access custom properties
  const userHasActiveSubscription = currentUser?.hasActiveSubscription === true;

  const pathname = usePathname();
  let title = "Dashboard Overview";
  if (pathname.startsWith('/category/')) {
      const slug = pathname.split('/').pop();
      if (slug) {
          const category = getCategoryBySlug(slug);
          title = category ? category.name : "Indicator Category";
      }
  } else if (pathname === '/') {
       title = "Dashboard Overview";
  } else if (pathname === '/account/profile') {
       title = "My Profile";
  } else if (pathname === '/pricing') {
       title = "Subscription Plans";
  }


  return (
    <header className="bg-card dark:bg-gray-800 shadow-sm h-auto py-2.5 md:h-16 flex flex-col md:flex-row items-center justify-between px-3 md:px-6 border-b dark:border-gray-700 flex-shrink-0 gap-2 md:gap-0">
      <div className="flex-grow md:flex-grow-0 mb-2 md:mb-0">
        <h1 className="text-md sm:text-lg font-semibold text-foreground dark:text-white text-center md:text-left truncate max-w-xs sm:max-w-sm md:max-w-md">
          {title}
        </h1>
      </div>
      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
         {/* Show these only if not on auth or profile pages */}
         {pathname !== '/login' && pathname !== '/register' && pathname !== '/forgot-password' && pathname !== '/reset-password' && pathname !== '/account/profile' && pathname !== '/pricing' && (
            <>
                <DateRangePicker />
                <CountrySelector />
            </>
         )}
         <ThemeToggle />

         {!isLoadingSession && currentUser && !userHasActiveSubscription && pathname !== '/pricing' && (
            <Link href="/pricing" passHref>
                <Button variant="default" size="sm" className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Gem className="mr-0 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Upgrade</span>
                </Button>
            </Link>
         )}

         {!isLoadingSession && (
            currentUser ? (
                <div className="flex items-center space-x-2">
                    <Link href="/account/profile" passHref>
                        <Button variant="ghost" size="sm" className="h-9 px-1 sm:px-2"> {/* Reduced padding for smaller screens */}
                            <UserCircle className="h-5 w-5" />
                            <span className="text-sm text-muted-foreground hidden md:inline ml-1 sm:ml-2">
                                {currentUser.name?.split(' ')[0] || currentUser.email?.split('@')[0]} {/* Show first name or email prefix */}
                            </span>
                        </Button>
                    </Link>
                     <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })} className="h-9 w-9" aria-label="Logout">
                                    <LogOut className="h-[1.1rem] w-[1.1rem]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Logout</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                (pathname !== '/login' && pathname !== '/register') && ( // Don't show Login on Login/Register pages
                    <div className="flex items-center space-x-2">
                        {pathname !== '/pricing' && ( // Don't show Pricing button if already on pricing page
                             <Link href="/pricing" passHref>
                                <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground">Pricing</Button>
                            </Link>
                        )}
                        <Button variant="outline" size="sm" className="h-9" onClick={() => signIn(undefined, { callbackUrl: pathname.startsWith('/api/auth') ? '/' : pathname })}>
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