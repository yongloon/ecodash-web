// src/app/favorites/page.tsx
"use client"; // To use useFavorites and useSession hooks

import React from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import IndicatorCard from '@/components/dashboard/IndicatorCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData'; // Or your actual data fetching logic
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StarOff } from 'lucide-react';

// Helper to fetch data for multiple indicators (simplified for this example)
// In a real app, you might want a dedicated API route for this if fetching server-side
// or batching client-side.
async function fetchFavoriteIndicatorsData(
    indicatorIds: string[], 
    dateRange?: { startDate?: string, endDate?: string }
): Promise<Array<{ indicator: IndicatorMetadata; latestValue: TimeSeriesDataPoint | null; historicalData: TimeSeriesDataPoint[] }>> {
  if (!indicatorIds || indicatorIds.length === 0) return [];

  const dataPromises = indicatorIds
    .map(id => getIndicatorById(id))
    .filter((indicator): indicator is IndicatorMetadata => !!indicator)
    .map(async (indicator) => {
      // Assuming 'US' for simplicity, or get from searchParams if you add country filter here
      const historicalData = await fetchIndicatorData(indicator, dateRange /*, 'US' */); 
      const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
      return { indicator, latestValue, historicalData };
    });
  return Promise.all(dataPromises);
}


export default function FavoritesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { favoriteIds, isLoadingFavorites, favoritesError } = useFavorites();
  
  const [resolvedIndicatorData, setResolvedIndicatorData] = React.useState<Awaited<ReturnType<typeof fetchFavoriteIndicatorsData>>>([]);
  const [isLoadingPageData, setIsLoadingPageData] = React.useState(false);

  // Fetch data for favorited indicators when favoriteIds are available
  // This uses client-side fetching. For SSR, you'd use getServerSession and fetch in the page component directly.
  React.useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login?callbackUrl=/favorites');
      return;
    }

    if (sessionStatus === 'authenticated' && favoriteIds.length > 0) {
      setIsLoadingPageData(true);
      // TODO: Get dateRange from URL searchParams if you have a DateRangePicker on this page too
      fetchFavoriteIndicatorsData(favoriteIds /*, dateRange */)
        .then(data => setResolvedIndicatorData(data))
        .catch(err => console.error("Error fetching data for favorites:", err))
        .finally(() => setIsLoadingPageData(false));
    } else if (sessionStatus === 'authenticated' && favoriteIds.length === 0) {
        setResolvedIndicatorData([]); // Clear data if no favorites
    }
  }, [favoriteIds, sessionStatus, router]);

  if (sessionStatus === "loading" || isLoadingFavorites || (sessionStatus === 'authenticated' && isLoadingPageData && favoriteIds.length > 0) ) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
            <p className="text-muted-foreground">Loading your favorite indicators...</p>
            {/* Add skeleton loaders for cards here */}
        </div>
    );
  }

  if (favoritesError) {
    return <p className="text-destructive text-center p-4">Error loading favorites: {favoritesError.message}</p>;
  }
  
  const userTier = (session?.user as any)?.activePlanTier;
  const canAccessFavorites = FAVORITES_ACCESS_TIERS.includes(userTier || 'free');

  if (sessionStatus === "authenticated" && !canAccessFavorites) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Favorites</h1>
            <p className="text-muted-foreground mb-6">
                Favoriting indicators and viewing your watchlist is a Basic/Pro feature.
            </p>
            <Link href="/pricing">
                <Button size="lg">Upgrade Your Plan</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">My Favorite Indicators</h1>
      
      {resolvedIndicatorData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {resolvedIndicatorData.map(({ indicator, latestValue, historicalData }) => (
            <IndicatorCard
              key={indicator.id}
              indicator={indicator}
              latestValue={latestValue}
              historicalData={historicalData}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <StarOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Favorites Yet</h2>
          <p className="text-muted-foreground mb-4">
            Click the star icon on any indicator card to add it to your favorites.
          </p>
          <Link href="/">
            <Button variant="outline">Explore Indicators</Button>
          </Link>
        </div>
      )}
    </div>
  );
}