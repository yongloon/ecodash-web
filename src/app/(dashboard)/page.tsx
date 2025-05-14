// src/app/(dashboard)/page.tsx
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata, indicatorCategories } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';

// UI Components
import SummaryCard from '@/components/dashboard/SummaryCard';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget'; // Assuming this exists
import EconomicCalendarWidget from '@/components/dashboard/EconomicCalendarWidget'; // Assuming this exists
import EarningsCalendarWidget from '@/components/dashboard/EarningsCalendarWidget'; // Assuming this exists
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gem, Star, TrendingUp, Zap, Newspaper, CalendarDays, Briefcase } from 'lucide-react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';

// Configuration for Overview Page
const headlineIndicatorIds = ['CPI_YOY_PCT', 'UNRATE', 'GDP_GROWTH', 'PMI'];
const marketSnapshotIndicatorIds = ['SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED'];
const MAX_FAVORITES_ON_OVERVIEW = 3;

const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30;
    if (frequency === 'Monthly') return 12;
    if (frequency === 'Quarterly') return 8;
    return 15;
};

// Helper function to fetch data for a list of indicator IDs
const fetchDataForIndicatorList = async (
    ids: string[], 
    country: string, 
    dateRange: { startDate?: string; endDate?: string }
): Promise<Array<{ 
    indicator: IndicatorMetadata; 
    latestValue: TimeSeriesDataPoint | null; 
    previousValue: TimeSeriesDataPoint | null; 
    sparklineData: TimeSeriesDataPoint[] 
}>> => {
  if (!ids || ids.length === 0) return [];
  return Promise.all(
      ids
      .map(id => getIndicatorById(id))
      .filter((indicator): indicator is IndicatorMetadata => {
          if (!indicator) console.warn(`[OverviewPage Fetch Helper] Indicator ID not found: ${id}`);
          return !!indicator;
      })
      .map(async (indicator) => {
          const shouldFetch = country === 'US' || 
                              indicator.apiSource === 'Mock' || 
                              ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(indicator.id);

          if (shouldFetch) {
              const historicalData = await fetchIndicatorData(indicator, dateRange); 
              const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
              const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
              const sparklineLength = getSparklineDataLength(indicator.frequency);
              const sparklineData = historicalData.slice(Math.max(0, historicalData.length - sparklineLength));
              return { indicator, latestValue, previousValue, sparklineData };
          }
          return { indicator, latestValue: null, previousValue: null, sparklineData: [] };
      })
  );
};


export default async function OverviewPage({
    searchParams
}: {
    searchParams?: {
        country?: string;
        startDate?: string; // Date range from URL params
        endDate?: string;
     };
}) {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier = userSessionData?.activePlanTier || 'free';
  const isLoggedIn = !!session?.user;
  const favoriteIndicatorIdsFromSession: string[] = userSessionData?.favoriteIndicatorIds || [];

  const country = searchParams?.country || 'US';
  // dateRange will be used by fetchIndicatorData
  // If startDate/endDate are not in searchParams, fetchIndicatorData uses its own defaults (last 1 year)
  const dateRange = { 
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
  };

  // Fetch all data concurrently
  const [
    summaryData, 
    marketSnapshotData, 
    favoritesInitialData
  ] = await Promise.all([
    fetchDataForIndicatorList(headlineIndicatorIds, country, dateRange),
    fetchDataForIndicatorList(marketSnapshotIndicatorIds, country, dateRange),
    (isLoggedIn && (userTier === 'basic' || userTier === 'pro') && favoriteIndicatorIdsFromSession.length > 0)
        ? fetchDataForIndicatorList(favoriteIndicatorIdsFromSession.slice(0, MAX_FAVORITES_ON_OVERVIEW), country, dateRange)
        : Promise.resolve([])
  ]);
  
  const favoritesSnippetData = favoritesInitialData;

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
            <CardContent className="pt-0 sm:pt-1">
              <p className="text-sm text-muted-foreground">
                Elevate your analysis with Indicator Comparison, full historical data, data exports, advanced analytics, and more.
              </p>
            </CardContent>
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Content Area (Takes up 2/3 on large screens) */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* My Favorites Snippet */}
          {favoritesSnippetData.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-foreground flex items-center">
                    <Star className="h-5 w-5 mr-2 text-amber-400 fill-amber-400"/> My Favorites
                </h2>
                <Link href="/favorites">
                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">View All →</Button>
                </Link>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${favoritesSnippetData.length >= 3 ? 'xl:grid-cols-3' : `xl:grid-cols-${favoritesSnippetData.length || 1}`} gap-4`}>
                {favoritesSnippetData.map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard 
                    key={`fav-${indicator.id}`} 
                    indicator={indicator} 
                    latestValue={latestValue} 
                    previousValue={previousValue} 
                    sparklineData={sparklineData} />
                ))}
              </div>
            </section>
          )}

          {/* Main Headline Indicators */}
          <section>
            {(favoritesSnippetData.length > 0) && <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {summaryData.length > 0 ? (
                  summaryData
                      .filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id))
                      .map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard 
                    key={indicator.id} 
                    indicator={indicator} 
                    latestValue={latestValue} 
                    previousValue={previousValue} 
                    sparklineData={sparklineData}/>
                  ))
              ) : ( <p className="col-span-full text-center text-muted-foreground py-8">No key indicators to display for this selection.</p> )}
              {summaryData.length > 0 && summaryData.filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id)).length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">Key indicators for this overview are currently unavailable.</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar-like Widget Area (Takes up 1/3 on large screens) */}
        <aside className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* Market Snapshot Widget */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center"><Zap className="h-5 w-5 mr-2 text-blue-500"/>Market Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {marketSnapshotData.length > 0 && marketSnapshotData.some(d => d.latestValue) ? marketSnapshotData.filter(d => d.latestValue).map(({indicator, latestValue, previousValue}) => {
                  let TrendIconWidget = FaMinus;
                  let trendColorWidget = 'text-muted-foreground';
                  if (latestValue?.value !== null && previousValue?.value !== null && latestValue?.value !== undefined && previousValue?.value !== undefined) {
                      if (latestValue.value > previousValue.value) { TrendIconWidget = FaArrowUp; trendColorWidget = 'text-[hsl(var(--chart-green))]'; }
                      else if (latestValue.value < previousValue.value) { TrendIconWidget = FaArrowDown; trendColorWidget = 'text-[hsl(var(--chart-red))]'; }
                  }
                  const categoryInfo = Object.values(indicatorCategories).find(c=>c.key === indicator.categoryKey);
                  const indicatorLink = categoryInfo ? `/category/${categoryInfo.slug}?indicator=${indicator.id}` : '/';

                  return (
                    <Link href={indicatorLink} key={`snap-${indicator.id}`} className="block p-2.5 rounded-md hover:bg-muted/50 transition-colors group border-b border-border/30 last:border-b-0">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground group-hover:text-primary">{indicator.name.replace(' (FRED)', '').replace(' (USD)', '').replace(' Index','')}</span>
                            <TrendIconWidget className={`h-3 w-3 ${trendColorWidget} flex-shrink-0`} />
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                            {latestValue?.value?.toLocaleString(undefined, { 
                                minimumFractionDigits: indicator.id === 'CRYPTO_FEAR_GREED' ? 0 : (indicator.unit === '%' ? 1:0),
                                maximumFractionDigits: 2 
                            }) ?? 'N/A'}
                            <span className="text-xs ml-1 text-muted-foreground">{indicator.unit !== 'Index (0-100)' ? indicator.unit : ''}</span>
                        </div>
                    </Link>
                  );
              }) : <p className="text-sm text-muted-foreground p-2.5">Snapshot data unavailable.</p>}
            </CardContent>
          </Card>

          {/* News Feed Widget */}
          <NewsFeedWidget itemCount={5} defaultCategory="business" defaultCountry="us" />

          {/* Economic Calendar Widget */}
          <EconomicCalendarWidget daysAhead={7} itemCount={4} />

          {/* Earnings Calendar Widget */}
          <EarningsCalendarWidget daysAhead={7} itemCount={5} />

        </aside>
      </div>
    </div>
  );
}