// src/components/dashboard/SidebarNav.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Corrected import for App Router
import { indicatorCategories, IndicatorCategoryKey } from '@/lib/indicators';
import { FaTachometerAlt, FaDollarSign as PricingIcon } from 'react-icons/fa';
import { Zap as ProToolsIcon, Settings as AccountIcon, Star as FavoriteIcon, BarChart3, MessageSquareIcon, BellIcon } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
// import { useTranslations } from 'next-intl'; // Uncomment if you start using translations here

interface SidebarNavProps {
  isMobileMenuOpen?: boolean;
  toggleMobileMenu?: () => void;
}

export default function SidebarNav({ isMobileMenuOpen, toggleMobileMenu }: SidebarNavProps) {
  const pathname = usePathname(); // Gets the path *without* the locale prefix
  const { data: session, status } = useSession();
  const isLoadingSession = status === "loading";
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier;
  const isLoggedIn = !!session?.user;
  // const t = useTranslations('SidebarNav'); // Example if you had a SidebarNav namespace

  const hasActivePaidSubscription = isLoggedIn && userTier && userTier !== 'free';

  const canSeeFavoritesLink = isLoggedIn && canUserAccessFeature(userTier, FEATURE_KEYS.FAVORITES);
  const canSeeProToolsLink = isLoggedIn && canUserAccessFeature(userTier, FEATURE_KEYS.INDICATOR_COMPARISON);
  const canSeeAlertsLink = isLoggedIn && canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP);

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

  // Note: Links here don't include locale prefix. next-intl's Link or middleware handles it.
  return (
    <>
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

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
             {/* <span className="text-lg font-semibold">EcoDash</span> */}
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
            // Compare pathname against the non-localized slug. Middleware handles locale.
            const isActive = pathname === `/category/${category.slug}` || pathname.startsWith(`/category/${category.slug}/`);
            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={navLinkClasses(isActive)}
                title={category.name}
                onClick={handleLinkClick}
              >
                <IconComponent className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>{category.name}</span>
              </Link>
            );
          })}

          <hr className="my-3 border-border/60" />
          
          {!isLoadingSession && canSeeFavoritesLink && (
              <Link
                  href="/favorites"
                  className={navLinkClasses(pathname === '/favorites')}
                  title="My Favorites"
                  onClick={handleLinkClick}
              >
                  <FavoriteIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span>My Favorites</span>
              </Link>
          )}

          {!isLoadingSession && canSeeProToolsLink && (
            <>
              <div className="px-4 pt-2 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Pro Tools</p>
              </div>
              <Link
                href="/pro/comparison"
                className={navLinkClasses(pathname.startsWith('/pro/comparison'))}
                title="Indicator Comparison"
                onClick={handleLinkClick}
              >
                <ProToolsIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                <span>Compare</span>
              </Link>
            </>
          )}
          
          {!isLoadingSession && canSeeAlertsLink && (
               <Link
                  href="/account/alerts" // Path to the new alerts management page
                  className={navLinkClasses(pathname === '/account/alerts')}
                  title="Manage Alerts"
                  onClick={handleLinkClick}
              >
                  <BellIcon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span>Manage Alerts</span>
              </Link>
          )}

          {!isLoadingSession && (!isLoggedIn || !hasActivePaidSubscription) && (
            <Link
              href="/pricing"
              className={navLinkClasses(pathname === '/pricing')}
              title="Pricing Plans"
              onClick={handleLinkClick}
            >
              <PricingIcon className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Pricing</span>
            </Link>
          )}

            <hr className="my-3 border-border/60" />
            <Link
              href="/contact?subject=EcoDash%20Beta%20Feedback"
              className={navLinkClasses(pathname === '/contact')}
              title="Beta Feedback"
              onClick={handleLinkClick}
            >
              <MessageSquareIcon className="h-4 w-4 mr-3 flex-shrink-0" />
              <span>Provide Feedback</span>
            </Link>

          <div className="flex-grow"></div> 

          {!isLoadingSession && isLoggedIn && (
               <Link
                  href="/account/profile"
                  className={`${navLinkClasses(pathname.startsWith('/account/profile') || pathname === '/account')} mt-2`} // Added startsWith for sub-routes
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