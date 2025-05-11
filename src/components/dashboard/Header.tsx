// src/components/dashboard/Header.tsx
"use client"; // <--- ENSURE THIS IS THE VERY FIRST LINE

import React from 'react';
import CountrySelector from './CountrySelector';
import { usePathname } from 'next/navigation'; // This hook requires "use client"
// useRouter was also imported in a previous snippet, also requires "use client"
// import { useRouter } from 'next/navigation'; 
import { getCategoryBySlug } from '@/lib/indicators';
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker';
import { useSession, signIn, signOut } from "next-auth/react"; // Requires "use client"
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Header() {
    const pathname = usePathname(); // Now valid because of "use client"
    // const router = useRouter(); // If you need router for navigation
    const { data: session, status } = useSession();
    const isLoading = status === "loading";
    const currentUser = session?.user;

    let title = "Dashboard Overview";
    if (pathname.startsWith('/category/')) {
        const slug = pathname.split('/').pop();
        if (slug) {
            const category = getCategoryBySlug(slug);
            title = category ? category.name : "Indicator Category";
        }
    } else if (pathname === '/') {
         title = "Dashboard Overview";
    }

  return (
    <header className="bg-card dark:bg-gray-800 shadow-sm h-auto py-2.5 md:h-16 flex flex-col md:flex-row items-center justify-between px-3 md:px-6 border-b dark:border-gray-700 flex-shrink-0 gap-2 md:gap-0">
      <div className="flex-grow md:flex-grow-0 mb-2 md:mb-0">
        <h1 className="text-md sm:text-lg font-semibold text-foreground dark:text-white text-center md:text-left truncate max-w-xs sm:max-w-sm md:max-w-md">
          {title}
        </h1>
      </div>
      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
         <DateRangePicker />
         <CountrySelector />
         <ThemeToggle />
         {!isLoading && (
            currentUser ? (
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">
                        Hi, {currentUser.name || currentUser.email}
                    </span>
                     <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => signOut()} className="h-9 w-9" aria-label="Logout">
                                    <LogOut className="h-[1.1rem] w-[1.1rem]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Logout</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                <Button variant="outline" size="sm" className="h-9" onClick={() => signIn()}>
                    <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
            )
         )}
      </div>
    </header>
  );
}