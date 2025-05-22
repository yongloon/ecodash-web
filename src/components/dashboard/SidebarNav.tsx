// src/components/dashboard/SidebarNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { indicatorCategories, IndicatorCategoryKey } from '@/lib/indicators';
import { FaTachometerAlt } from 'react-icons/fa'; // Removed PricingIcon
import { /* Zap as ProToolsIcon, */ Settings as AccountIcon /*, Star as FavoriteIcon */, BarChart3 } from 'lucide-react'; // Commented out unused
import { useSession } from 'next-auth/react';
// import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Not needed for MVP sidebar logic

interface SidebarNavProps {
  isMobileMenuOpen?: boolean;
  toggleMobileMenu?: () => void;
}

export default function SidebarNav({ isMobileMenuOpen, toggleMobileMenu }: SidebarNavProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  // const userSessionData = session?.user as any; // Not strictly needed for MVP sidebar
  // const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier; // Not needed
  const isLoggedIn = !!session?.user;

  // const hasActivePaidSubscription = isLoggedIn && userTier && userTier !== 'free'; // Not needed

  // const canSeeFavoritesLink = isLoggedIn && FAVORITES_SIDEBAR_ACCESS_TIERS.includes(userTier || 'free'); // Removed
  // const canSeeProToolsLink = isLoggedIn && PRO_TOOLS_SIDEBAR_ACCESS_TIERS.includes(userTier || 'free'); // Removed

  const navLinkClasses = (isActive: boolean) => 
    `flex items-center px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted/50'
    }`;
  
  const handleLinkClick = () => {
    if (isMobileMenuOpen && toggleMobileMenu) {
      toggleMobileMenu();
    }
  };

  return (
    <>
      {/* ... (Overlay for mobile - keep as is) ... */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          w-64 bg-card text-card-foreground 
          border-r border-border/60 
          transition-transform duration-300 ease-in-out 
          md:static md:translate-x-0 md:w-64 
          ${isMobileMenuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
          overflow-y-auto
        `}
        aria-label="Main Navigation"
      >
        <div className="flex items-center justify-center h-16 border-b border-border/60 px-4 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 group" onClick={handleLinkClick}>
             <BarChart3 className="h-7 w-7 text-primary group-hover:opacity-80 transition-opacity" />
          </Link>
        </div>
        <nav className="mt-4 px-2 pb-4 space-y-1 flex-grow flex flex-col">
          <Link href="/" className={navLinkClasses(pathname === '/')} onClick={handleLinkClick}>
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
                onClick={handleLinkClick}
              >
                <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>{category.name}</span>
              </Link>
            );
          })}

          {/* Separator, Favorites, Pro Tools, Pricing links removed for MVP */}
          
          <div className="flex-grow"></div> 

          {!isLoadingSession && isLoggedIn && (
               <Link
                  href="/account/profile" // Profile page will be simplified
                  className={`${navLinkClasses(pathname === '/account/profile')} mt-2`}
                  title="My Account"
                  onClick={handleLinkClick}
              >
                  <AccountIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span>My Account</span>
              </Link>
          )}
        </nav>
      </div>
    </>
  );
}