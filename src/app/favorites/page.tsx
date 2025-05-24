// src/app/favorites/page.tsx
"use client"; 

import React, { useEffect, useState, useMemo } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import IndicatorCard from '@/components/dashboard/IndicatorCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StarOff, AlertTriangle, Loader2, Star } from 'lucide-react'; 
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
import toast from 'react-hot-toast';

type ResolvedIndicatorType = { 
    indicator: IndicatorMetadata; 
    latestValue: TimeSeriesDataPoint | null; 
    historicalData: TimeSeriesDataPoint[];
    error?: string | null; // Added to carry fetch errors per indicator
};

export default function FavoritesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { favoriteIds, isLoadingFavorites, favoritesError: SWRFavoritesError } = useFavorites(); // Renamed to avoid conflict
  
  const [resolvedIndicatorData, setResolvedIndicatorData] = useState<ResolvedIndicatorType[]>([]);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null); // For general page errors

  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  
  const canAccessFavoritesPage = useMemo(() => {
      if (sessionStatus !== 'authenticated') return false;
      return canUserAccessFeature(userTier, FEATURE_KEYS.FAVORITES);
  }, [sessionStatus, userTier]);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login?callbackUrl=/favorites');
      return;
    }

    if (sessionStatus === 'authenticated' && canAccessFavoritesPage && favoriteIds.length > 0) {
      setIsLoadingPageData(true);
      setPageError(null);
      const dateRange = { 
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      };

      const fetchData = async () => {
          try {
            const dataPromises = favoriteIds
                .map(id => {
                    const indicatorMeta = getIndicatorById(id);
                    // DEBUG LOGGING FOR BTC METADATA
                    if (indicatorMeta && indicatorMeta.id === 'BTC_PRICE_USD') {
                        console.log("[FavoritesPage] BTC Metadata from getIndicatorById:", JSON.stringify(indicatorMeta, null, 2));
                    }
                    return indicatorMeta;
                })
                .filter((indicator): indicator is IndicatorMetadata => !!indicator)
                .map(async (indicator) => {
                    // DEBUG LOGGING BEFORE FETCHING
                    if (indicator.id === 'BTC_PRICE_USD') {
                        console.log(`[FavoritesPage] Attempting to fetch BTC with apiSource: ${indicator.apiSource}, apiIdentifier: ${indicator.apiIdentifier}`);
                    }
                    try {
                        const historicalData = await fetchIndicatorData(indicator, dateRange); 
                        const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
                        return { indicator, latestValue, historicalData, error: null };
                    } catch (fetchErr: any) {
                        console.error(`[FavoritesPage] Error fetching data for ${indicator.id}:`, fetchErr.message);
                        return { indicator, latestValue: null, historicalData: [], error: fetchErr.message || "Failed to load data." };
                    }
                });
            const results = await Promise.all(dataPromises);
            setResolvedIndicatorData(results);
          } catch (err: any) { // This catch is for Promise.all or other general errors in fetchData
            console.error("Error in fetchData for favorites list (Promise.all or setup):", err);
            setPageError(err.message || "Failed to load indicator data for your favorites.");
            toast.error(err.message || "Error loading some favorite indicator data.");
          } finally {
            setIsLoadingPageData(false);
          }
      };
      fetchData();
    } else if (sessionStatus === 'authenticated' && favoriteIds.length === 0 && !isLoadingFavorites) {
        setResolvedIndicatorData([]);
        setIsLoadingPageData(false);
    }
  }, [favoriteIds, sessionStatus, router, canAccessFavoritesPage, searchParams, isLoadingFavorites]); // Added isLoadingFavorites


  if (sessionStatus === "loading" || (sessionStatus === "authenticated" && isLoadingFavorites)) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your favorites...</p>
        </div>
    );
  }

  if (SWRFavoritesError) { // Use the renamed SWR error
    const errInfo = (SWRFavoritesError as any)?.info;
    const displayError = errInfo?.error || errInfo?.message || SWRFavoritesError.message || "An unexpected error occurred.";
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Favorites List</h1>
            <p className="text-muted-foreground mb-4">{displayError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
        </div>
    );
  }
   if (pageError && !isLoadingPageData) { // Show general page error if data loading is complete
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Indicator Data</h1>
            <p className="text-muted-foreground mb-4">{pageError}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
        </div>
    );
  }
  
  if (sessionStatus === "authenticated" && !canAccessFavoritesPage) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
            <StarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Favorites Not Available</h1>
            <p className="text-muted-foreground mb-6 max-w-md">
                Managing and viewing a list of favorite indicators is a feature available on our Basic and Pro plans.
            </p>
            <Link href="/pricing">
                <Button size="lg">Upgrade Your Plan</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8"> 
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center">
            <Star className="h-6 w-6 mr-3 text-amber-400 fill-amber-400"/> 
            My Favorite Indicators
        </h1>
      </div>
      
      {isLoadingPageData && favoriteIds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[...Array(Math.min(favoriteIds.length, 6))].map((_, i) => (
                  <div key={`skel-${i}`} className="rounded-lg border bg-card p-6 shadow-sm animate-pulse h-[280px] md:h-[320px]">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="h-32 sm:h-40 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mt-4"></div>
                  </div>
              ))}
          </div>
      )}

      {!isLoadingPageData && resolvedIndicatorData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {resolvedIndicatorData.map(({ indicator, latestValue, historicalData, error }) => (
            <IndicatorCard
              key={indicator.id}
              indicator={indicator}
              latestValue={latestValue}
              historicalData={historicalData}
              fetchError={error} // Pass the specific error for this card
            />
          ))}
        </div>
      ) : !isLoadingPageData && favoriteIds.length === 0 && sessionStatus === 'authenticated' && canAccessFavoritesPage ? (
        <div className="text-center py-10 border border-dashed rounded-lg bg-card">
          <StarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Favorites Yet</h2>
          <p className="text-muted-foreground mb-4">
            Click the star icon on any indicator card to add it to your favorites.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Explore Indicators</Button>
          </Link>
        </div>
      ) : null}
      {!isLoadingPageData && SWRFavoritesError && (
        // This is a fallback if SWR error occurs but pageError wasn't set by fetchData (less likely now)
        <div className="text-center text-destructive py-10">
            <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
            <p>Could not load your list of favorites.</p>
        </div>
      )}
    </div>
  );
}