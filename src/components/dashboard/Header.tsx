// src/components/dashboard/Header.tsx
'use client'; // Make it a client component if it includes client-side interactions like state or effects

import React from 'react';
import CountrySelector from './CountrySelector'; // Import the selector
import { usePathname } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/indicators'; // Helper to get category name

// Header Component for the Dashboard
export default function Header() {
    const pathname = usePathname();

    // Determine the title based on the current path
    let title = "Dashboard Overview";
    if (pathname.startsWith('/category/')) {
        const slug = pathname.split('/').pop(); // Get the last part of the path (slug)
        if (slug) {
            const category = getCategoryBySlug(slug);
            if (category) {
                title = category.name;
            } else {
                 title = "Indicator Category"; // Fallback title
            }
        }
    } else if (pathname === '/') {
         title = "Dashboard Overview";
    }
     // Add more conditions for other potential pages

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-between px-4 md:px-6 border-b dark:border-gray-700 flex-shrink-0">
      {/* Left side - Dynamic Title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right side - Country Selector and other actions */}
      <div className="flex items-center space-x-4">
         <CountrySelector />
        {/* Add other header elements here (e.g., User menu, Theme toggle button) */}
      </div>
    </header>
  );
}
