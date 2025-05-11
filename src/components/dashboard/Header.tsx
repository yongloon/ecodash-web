// src/components/dashboard/Header.tsx
'use client';

import React from 'react';
import CountrySelector from './CountrySelector';
import { usePathname, useRouter } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/indicators';
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LogOut } from 'lucide-react'; // UserCircle removed if not used
// MODIFIED: Import Tooltip components from Shadcn/ui
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentUser, logout, isLoading } = useAuth();
    let title = "Dashboard Overview";

    // --- Your existing title logic ---
    if (pathname.startsWith('/category/')) {
        const slug = pathname.split('/').pop();
        if (slug) {
            const category = getCategoryBySlug(slug);
            title = category ? category.name : "Indicator Category";
        }
    } else if (pathname === '/') {
         title = "Dashboard Overview";
    }
    // --- End of title logic ---

    const handleLogout = () => {
      logout();
      router.push('/login');
    };

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
                        Hi, {currentUser.username}
                    </span>
                    {/* MODIFIED: Wrap the logout button's Tooltip with TooltipProvider */}
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-9 w-9" aria-label="Logout">
                                    <LogOut className="h-[1.1rem] w-[1.1rem]" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Logout</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                <Link href="/login" passHref>
                    <Button variant="outline" size="sm" className="h-9">Login</Button>
                </Link>
            )
         )}
      </div>
    </header>
  );
}