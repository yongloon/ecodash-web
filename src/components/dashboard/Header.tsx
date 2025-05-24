// src/components/dashboard/Header.tsx
"use client"; 

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // <<< IMPORT BADGE
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    LogIn, LogOut, UserCircle, 
    Menu as HamburgerIcon, X as CloseIcon, Search, Gem // Gem for Pro
} from 'lucide-react'; 

import CountrySelector from './CountrySelector'; 
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { CommandPalette } from '@/components/CommandPalette';

interface HeaderProps {
  toggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

// Helper function to determine badge variant based on plan tier
const getPlanBadgeVariant = (tier?: AppPlanTier): VariantProps<typeof Badge>["variant"] => {
    switch (tier) {
        case 'pro': return 'pro'; // Use custom 'pro' variant if defined in badge.tsx
        case 'basic': return 'basic'; // Use custom 'basic' variant
        case 'free': return 'outline'; // Use 'outline' or your custom 'free' variant
        case 'custom_paid': return 'default'; // For other paid plans
        default: return 'outline'; // Fallback
    }
};

export default function Header({ toggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const currentUser = session?.user as any; // Cast to any to access custom session properties
  const userTier: AppPlanTier | undefined = currentUser?.activePlanTier;
  const activePlanName: string | undefined = currentUser?.activePlanName;
  
  const pathname = usePathname();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isSpecialPage = isAuthPage || pathname === '/pricing' || pathname.startsWith('/account/') || pathname === '/contact' || pathname === '/terms' || pathname === '/privacy' || pathname.startsWith('/subscribe/');


  return (
    <>
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
          <Link href="/" className="text-xl font-bold text-primary group-hover:opacity-80 transition-opacity">
              EcoDash
          </Link>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
           {!isSpecialPage && (
              <div className="hidden sm:flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
                  <DateRangePicker />
                  <CountrySelector />
              </div>
           )}

          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="h-9 w-9"
                  aria-label="Open command palette"
                >
                  <Search className="h-[1.1rem] w-[1.1rem]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search & Navigate (⌘K)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
           
           <ThemeToggle />

           {!isLoadingSession && (
              currentUser ? ( 
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                      {/* Subscription Badge */}
                      {activePlanName && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href="/pricing" passHref className="hidden lg:inline-flex"> {/* Hide on smaller screens if too crowded */}
                                        <Badge 
                                            variant={getPlanBadgeVariant(userTier)} 
                                            className="cursor-pointer items-center py-1 px-2.5" // Adjusted padding for better look
                                        >
                                            {userTier === 'pro' && <Gem className="mr-1.5 h-3 w-3" />}
                                            {userTier === 'basic' && <Star className="mr-1.5 h-3 w-3 fill-current" />} {/* Example for Basic */}
                                            {activePlanName}
                                        </Badge>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Current Plan: {activePlanName}. Click to view plans.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* User Profile Button */}
                      <Link href="/account/profile" passHref>
                          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-9 sm:w-auto sm:px-2" aria-label="My Profile">
                              <UserCircle className="h-5 w-5 sm:mr-0 md:mr-1.5" />
                              <span className="text-sm text-muted-foreground hidden md:inline">
                                  {currentUser.name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                              </span>
                          </Button>
                      </Link>
                      {/* Logout Button */}
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
                  !isAuthPage && ( 
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                          {pathname !== '/pricing' && (
                               <Link href="/pricing" passHref>
                                  <Button variant="ghost" size="sm" className="h-9 text-muted-foreground hover:text-foreground px-2 sm:px-3">Pricing</Button>
                              </Link>
                          )}
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
      <CommandPalette open={isCommandPaletteOpen} setOpen={setIsCommandPaletteOpen} />
    </>
  );
}