// src/components/dashboard/SidebarNav.tsx
"use client"; // <--- ADD THIS DIRECTIVE AT THE TOP

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // This hook requires "use client"
import { indicatorCategories, IndicatorCategoryKey } from '@/lib/indicators';
import { FaTachometerAlt, FaDollarSign } from 'react-icons/fa'; // Added FaDollarSign for Pricing example

export default function SidebarNav() {
  const pathname = usePathname(); // Now correctly used in a Client Component

  const isCategoryActive = (slug: string) => {
    return pathname === `/category/${slug}`;
  };
  const isOverviewActive = pathname === '/'; // Assuming overview is at the root of the (dashboard) group

  return (
    <div className="w-16 md:w-64 bg-card dark:bg-gray-800 flex-shrink-0 border-r dark:border-gray-700 transition-all duration-300 ease-in-out overflow-y-auto">
      <div className="flex items-center justify-center md:justify-start h-16 border-b dark:border-gray-700 px-4">
        <Link href="/" className="flex items-center gap-2">
           <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hidden md:inline">
            EcoDash
           </span>
           <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 md:hidden">
            E
           </span>
        </Link>
      </div>
      <nav className="mt-4 px-2 pb-4">
        <Link
          href="/" // Links to the root of the (dashboard) group
          className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
            isOverviewActive
              ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
          }`}
        >
          <FaTachometerAlt className="h-5 w-5 mr-0 md:mr-3 flex-shrink-0" />
          <span className="hidden md:inline">Overview</span>
        </Link>

        {Object.keys(indicatorCategories).map((key) => {
          const category = indicatorCategories[key as IndicatorCategoryKey];
          const IconComponent = category.icon; // Use the IconComponent directly
          const isActive = isCategoryActive(category.slug);
          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={`mt-2 flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
              }`}
              title={category.name}
            >
              <IconComponent className="h-5 w-5 mr-0 md:mr-3 flex-shrink-0" /> {/* Render the icon component */}
              <span className="hidden md:inline">{category.name}</span>
            </Link>
          );
        })}

        {/* Pricing Link in Sidebar */}
        <Link
          href="/pricing"
          className={`mt-2 flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
            pathname === '/pricing'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-white'
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
          }`}
          title="Pricing Plans"
        >
          <FaDollarSign className="h-5 w-5 mr-0 md:mr-3 flex-shrink-0" />
          <span className="hidden md:inline">Pricing</span>
        </Link>
      </nav>
    </div>
  );
}