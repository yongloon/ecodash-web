// src/app/(dashboard)/page.tsx
import React from 'react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gem } from 'lucide-react';

// Ensure these IDs exist in your indicators.ts and can fetch data
const headlineIndicatorIds = ['SP500', 'UNRATE', 'CPI_YOY_PCT', 'BTC_PRICE_USD', 'GDP_GROWTH', 'CRYPTO_FEAR_GREED'];

const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30; // Last 30 available points
    if (frequency === 'Monthly') return 12; // Last 12 months
    if (frequency === 'Quarterly') return 8;  // Last 8 quarters
    return 15; // Default
};

export default async function OverviewPage({
    searchParams
}: {
    searchParams?: {
        country?: string;
        startDate?: string;
        endDate?: string;
     };
}) {
  const session = await getServerSession(authOptions);
  const userTier: AppPlanTier = (session?.user as any)?.activePlanTier || 'free';
  const isLoggedIn = !!session?.user;

  const country = searchParams?.country || 'US';
  // dateRange will be used by fetchIndicatorData for the main data and "latestValue"
  // It defaults to last 1 year inside fetchIndicatorData if not provided or invalid
  const dateRange = { 
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
  };

  // console.log(`[OverviewPage] User Tier: ${userTier}, LoggedIn: ${isLoggedIn}`);
  // console.log(`[OverviewPage] Fetching summary data for country: ${country}, range: ${dateRange.startDate} to ${dateRange.endDate}`);

  const summaryDataPromises = headlineIndicatorIds
    .map(id => getIndicatorById(id))
    .filter((indicator): indicator is IndicatorMetadata => {
        if (!indicator) console.warn(`[OverviewPage] Indicator ID not found: ${id}`);
        return !!indicator;
    })
    .map(async (indicator) => {
       const shouldFetch = country === 'US' || 
                           indicator.apiSource === 'Mock' || 
                           ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED'].includes(indicator.id);

       if (shouldFetch) {
            const historicalData = await fetchIndicatorData(indicator, dateRange); 
            const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
            const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
            
            const sparklineLength = getSparklineDataLength(indicator.frequency);
            // Slice from the end, ensuring not to go out of bounds if historicalData is shorter than sparklineLength
            const sparklineData = historicalData.slice(Math.max(0, historicalData.length - sparklineLength));

            // console.log(`[OverviewPage] For ${indicator.id}, latest: ${latestValue?.value}, sparkline points: ${sparklineData.length}`);
            return { indicator, latestValue, previousValue, sparklineData };
       } else {
            // console.log(`[OverviewPage] Skipping fetch for ${indicator.id} for country ${country}`);
            return { indicator, latestValue: null, previousValue: null, sparklineData: [] };
       }
    });

  const summaryData = await Promise.all(summaryDataPromises);
  // console.log("[OverviewPage] Resolved summaryData count:", summaryData.length);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
      </div>
      
      {isLoggedIn && (userTier === 'free' || userTier === 'basic') && (
          <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
            <CardHeader className="pb-3 sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Gem className="h-6 w-6 text-primary flex-shrink-0" /> 
                <CardTitle className="text-lg sm:text-xl text-primary">
                  Unlock an Edge with EcoDash Pro!
                </CardTitle>
              </div>
              <Link href="/pricing" className="mt-2 sm:mt-0 flex-shrink-0">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">Explore Pro Features</Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-1"> {/* Adjusted padding */}
              <p className="text-sm text-muted-foreground">
                Elevate your analysis with Indicator Comparison, full historical data, data exports, advanced analytics, and more.
              </p>
            </CardContent>
          </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {summaryData.length > 0 ? (
            summaryData
                // Filter out cards that have no latestValue unless it's a global indicator or non-US country (where data might be sparse)
                .filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED'].includes(data.indicator.id))
                .map(({ indicator, latestValue, previousValue, sparklineData }) => (
            <SummaryCard
                key={indicator.id}
                indicator={indicator}
                latestValue={latestValue}
                previousValue={previousValue}
                sparklineData={sparklineData}
            />
            ))
        ) : (
            <p className="col-span-full text-center text-muted-foreground py-8">Loading overview data or no indicators configured for this view.</p>
        )}
        {summaryData.length > 0 && summaryData.filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED'].includes(data.indicator.id)).length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">Key indicators for this overview are currently unavailable. Try adjusting the date range or country.</p>
        )}
      </div>
    </div>
  );
}