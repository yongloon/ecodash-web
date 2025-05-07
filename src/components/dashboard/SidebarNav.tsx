// src/components/dashboard/SidebarNav.tsx
'use client'; // Needed for using hooks like usePathname

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { indicatorCategories, IndicatorCategoryKey } from '@/lib/indicators';
import { FaTachometerAlt } from 'react-icons/fa'; // Icon for Overview

// Sidebar Navigation Component
export default function SidebarNav() {
  const pathname = usePathname(); // Get current path

  // Determine if a category link is active
  const isCategoryActive = (slug: string) => {
    // Check if the current path starts with the category slug path
    return pathname === `/category/${slug}`;
  };

  // Check if the overview page is active (root path within the dashboard group)
  const isOverviewActive = pathname === '/';

  return (
    <div className="w-16 md:w-64 bg-white dark:bg-gray-800 flex-shrink-0 border-r dark:border-gray-700 transition-all duration-300 ease-in-out overflow-y-auto">
      <div className="flex items-center justify-center md:justify-start h-16 border-b dark:border-gray-700 px-4">
        {/* Logo/Title */}
        <Link href="/" className="flex items-center gap-2">
           <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hidden md:inline">
            EcoDash
           </span>
           <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 md:hidden">
            E
           </span>
        </Link>
      </div>
      <nav className="mt-4 px-2 pb-4"> {/* Added pb-4 for bottom padding */}
        {/* Overview Link */}
        <Link
          href="/"
          className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
            isOverviewActive
              ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
          }`}
        >
          <FaTachometerAlt className="h-5 w-5 mr-0 md:mr-3 flex-shrink-0" />
          <span className="hidden md:inline">Overview</span>
        </Link>

        {/* Category Links */}
        {Object.keys(indicatorCategories).map((key) => {
          const category = indicatorCategories[key as IndicatorCategoryKey];
          const Icon = category.icon;
          const isActive = isCategoryActive(category.slug);
          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`mt-2 flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
              title={category.name} // Tooltip for small sidebar
            >
              <Icon className="h-5 w-5 mr-0 md:mr-3 flex-shrink-0" />
              <span className="hidden md:inline">{category.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
