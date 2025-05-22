// src/components/dashboard/Header.tsx
"use client"; 

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    LogIn, LogOut, /* Gem, */ UserCircle, // Gem removed as it was likely for Pro/Upgrade CTA
    Menu as HamburgerIcon, X as CloseIcon 
} from 'lucide-react'; 

import CountrySelector from './CountrySelector'; 
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker';
// import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Not strictly needed for MVP header logic

interface HeaderProps {
  toggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export default function Header({ toggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const currentUser = session?.user as any;
  // const userTier: AppPlanTier | undefined = currentUser?.activePlanTier; // Not needed for MVP header
  
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  // For MVP, account/profile is still relevant, pricing and subscribe/success are not.
  const isSpecialPage = isAuthPage || pathname.startsWith('/account/') || pathname === '/contact';


  return (
    <header className="bg-card text-card-foreground shadow-sm h-16 flex items-center justify-between px-3 md:px-6 border-b border-border/60 flex-shrink-0">
      <div className="flex items-center space-x-2">
        {toggleMobileMenu && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-9 w-9"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
                {isMobileMenuOpen ? <CloseIcon className="h-5 w-5"/> : <HamburgerIcon className="h-5 w-5"/>}
            </Button>
        )}
        <Link href="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
            EcoDash
        </Link>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
         {/* For MVP, these are still useful on dashboard pages */}
         {!isSpecialPage && (
            <div className="hidden sm:flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
                <DateRangePicker />
                <CountrySelector />
            </div>
         )}
         <ThemeToggle />

         {/* Upgrade Buttons logic removed for MVP */}

         {!isLoadingSession && (
            currentUser ? ( 
                <div className="flex items-center space-x-1 sm:space-x-2">
                    <Link href="/account/profile" passHref>
                        <Button variant="ghost" size="icon" className="h-9 w-9 sm:size-auto sm:px-2" aria-label="My Profile">
                            <UserCircle className="h-5 w-5 sm:mr-0 md:mr-1.5" />
                            <span className="text-sm text-muted-foreground hidden md:inline">
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
            ) : ( // If NOT logged in
                !isAuthPage && ( 
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                        {/* --- PRICING LINK REMOVED FROM HERE --- */}
                        <Link href="/login" passHref>
                            <Button variant="outline" size="sm" className="h-9 px-2 sm:px-3">
                                <LogIn className="mr-1.5 h-4 w-4" /> Login
                            </Button>
                        </Link>
                    </div>
                )
            )
         )}
      </div>
    </header>
  );
}