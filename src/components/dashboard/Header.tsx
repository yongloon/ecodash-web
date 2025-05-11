// src/components/dashboard/Header.tsx
'use client';

import React from 'react';
import CountrySelector from './CountrySelector';
import { usePathname } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/indicators';
import { ThemeToggle } from './ThemeToggle';
import { DateRangePicker } from './DateRangePicker'; // Import DateRangePicker

export default function Header() {
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
    }

  return (
    <header className="bg-card dark:bg-gray-800 shadow-sm h-auto py-2.5 md:h-16 flex flex-col md:flex-row items-center justify-between px-3 md:px-6 border-b dark:border-gray-700 flex-shrink-0 gap-2 md:gap-0">
      <div className="flex-grow md:flex-grow-0 mb-2 md:mb-0">
        <h1 className="text-md sm:text-lg font-semibold text-foreground dark:text-white text-center md:text-left truncate max-w-xs sm:max-w-sm md:max-w-md">
          {title}
        </h1>
      </div>
      <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3"> {/* Adjusted spacing */}
         <DateRangePicker />
         <CountrySelector />
         <ThemeToggle />
      </div>
    </header>
  );
}