// src/components/dashboard/SidebarNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { indicatorCategories, IndicatorCategoryKey } from '@/lib/indicators';
import { FaTachometerAlt, FaDollarSign as PricingIcon } from 'react-icons/fa'; // Renamed for clarity
import { Zap as ProToolsIcon, Settings as AccountIcon } from 'lucide-react'; // Icons
import { useSession } from 'next-auth/react';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Ensure path is correct

export default function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  const isLoggedIn = !!session?.user;

  const canAccessProTools = userTier === 'pro';

  const navLinkClasses = (isActive: boolean) => 
    `flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
    }`;

  return (
    <div className="hidden md:flex md:flex-col md:w-64 bg-card text-card-foreground flex-shrink-0 border-r border-border/60 transition-all duration-300 ease-in-out overflow-y-auto">
      <div className="flex items-center justify-center md:justify-start h-16 border-b border-border/60 px-4">
        <Link href="/" className="flex items-center gap-2 group">
           <span className="text-xl font-bold text-primary group-hover:opacity-80 transition-opacity">
            EcoDash
           </span>
        </Link>
      </div>
      <nav className="mt-4 px-2 pb-4 space-y-1">
        <Link href="/" className={navLinkClasses(pathname === '/')}>
          <FaTachometerAlt className="h-4 w-4 mr-3 flex-shrink-0" />
          <span>Overview</span>
        </Link>

        {Object.keys(indicatorCategories).map((key) => {
          const category = indicatorCategories[key as IndicatorCategoryKey];
          const IconComponent = category.icon;
          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={navLinkClasses(pathname === `/category/${category.slug}`)}
              title={category.name}
            >
              <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>{category.name}</span>
            </Link>
          );
        })}

        {/* Separator */}
        <hr className="my-3 border-border/60" />

        {/* Pro Tools Section - Conditionally Rendered */}
        {canAccessProTools && (
          <>
            <div className="px-4 pt-2 pb-1">
                <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Pro Tools</p>
            </div>
            <Link
              href="/pro/comparison" // Example Pro tool page
              className={navLinkClasses(pathname.startsWith('/pro/comparison'))}
              title="Indicator Comparison"
            >
              <ProToolsIcon className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Compare</span>
            </Link>
            {/* Add more Pro links here */}
          </>
        )}
        
        <Link
          href="/pricing"
          className={navLinkClasses(pathname === '/pricing')}
          title="Pricing Plans"
        >
          <PricingIcon className="h-4 w-4 mr-3 flex-shrink-0" />
          <span>Pricing</span>
        </Link>

        {isLoggedIn && (
             <Link
                href="/account/profile"
                className={navLinkClasses(pathname === '/account/profile')}
                title="My Account"
            >
                <AccountIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>My Account</span>
            </Link>
        )}
      </nav>
    </div>
  );
}