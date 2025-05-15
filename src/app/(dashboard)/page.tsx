// src/app/(dashboard)/page.tsx
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata, indicatorCategories } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import SummaryCard from '@/components/dashboard/SummaryCard';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget';
import EconomicCalendarWidget from '@/components/dashboard/EconomicCalendarWidget';
import EarningsCalendarWidget from '@/components/dashboard/EarningsCalendarWidget';
import AssetRiskItem from '@/components/dashboard/AssetRiskItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gem, Star, TrendingUp, Zap, Newspaper, CalendarDays, Briefcase, Shield, TrendingDownIcon, Activity } from 'lucide-react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { subDays, format, parseISO, isValid, differenceInDays } from 'date-fns'; // <<< CORRECTED IMPORT

// Configuration for Overview Page
const headlineIndicatorIds = ['CPI_YOY_PCT', 'UNRATE', 'GDP_GROWTH', 'PMI'];
const marketSnapshotIndicatorIds = ['SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED'];
const MAX_FAVORITES_ON_OVERVIEW = 3;

const lowRiskAssetIds = ['DTB3', 'GOLD_PRICE'];
const moderateRiskAssetIds = ['SP500', 'BAA_YIELD', 'REIT_INDEX'];
const highRiskAssetIds = ['NASDAQ_100', 'BTC_PRICE_USD', 'EEM_ETF'];

const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30;
    if (frequency === 'Monthly') return 12;
    if (frequency === 'Quarterly') return 8;
    return 15;
};

const fetchDataForIndicatorList = async (
    ids: string[],
    country: string,
    dateRange: { startDate?: string; endDate?: string },
    fetchExtraForChanges: boolean = false
): Promise<Array<{
    indicator: IndicatorMetadata;
    latestValue: TimeSeriesDataPoint | null;
    previousValue: TimeSeriesDataPoint | null;
    sparklineData: TimeSeriesDataPoint[];
    change7D?: number | null;
    change30D?: number | null;
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
                              ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500', 'GOLD_PRICE', 'NASDAQ_100', 'EEM_ETF', 'DTB3', 'BAA_YIELD', 'REIT_INDEX'].includes(indicator.id);

          if (shouldFetch) {
              let historyFetchRange = { ...dateRange };
              if (fetchExtraForChanges) {
                const today = new Date();
                historyFetchRange.startDate = format(subDays(today, 40), 'yyyy-MM-dd');
                historyFetchRange.endDate = format(today, 'yyyy-MM-dd');
              }

              const historicalData = await fetchIndicatorData(indicator, historyFetchRange);
              const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
              const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
              let change7D: number | null = null;
              let change30D: number | null = null;

              if (fetchExtraForChanges && latestValue?.date && latestValue.value !== null && historicalData.length > 0) {
                const findValueDaysAgo = (days: number) => {
                    // Find the point closest to 'days' ago, but not after latestValue.date
                    const targetDate = subDays(parseISO(latestValue.date!), days);
                    let closestPoint: TimeSeriesDataPoint | undefined = undefined;
                    let minDiff = Infinity;

                    for (let i = historicalData.length - 1; i >= 0; i--) {
                        const point = historicalData[i];
                        if (point.date === latestValue.date || !point.value) continue; // Skip latest or null
                        const pointDate = parseISO(point.date);
                        if (pointDate > parseISO(latestValue.date!)) continue; // Ensure past date

                        const diff = Math.abs(differenceInDays(targetDate, pointDate));
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestPoint = point;
                        }
                        // Optimization: if we've gone too far back for this 'days' window, break
                        if (pointDate < subDays(targetDate, days * 2) && minDiff < days) break;
                    }
                    return closestPoint;
                };

                const value7DaysAgo = findValueDaysAgo(7);
                const value30DaysAgo = findValueDaysAgo(30);

                if (value7DaysAgo?.value && latestValue.value) {
                    change7D = ((latestValue.value - value7DaysAgo.value) / Math.abs(value7DaysAgo.value === 0 ? 1 : value7DaysAgo.value)) * 100;
                }
                if (value30DaysAgo?.value && latestValue.value) {
                    change30D = ((latestValue.value - value30DaysAgo.value) / Math.abs(value30DaysAgo.value === 0 ? 1 : value30DaysAgo.value)) * 100;
                }
              }

              const sparklineLength = getSparklineDataLength(indicator.frequency);
              const sparklineData = historicalData.slice(Math.max(0, historicalData.length - sparklineLength));
              return { indicator, latestValue, previousValue, sparklineData, change7D, change30D };
          }
          return { indicator, latestValue: null, previousValue: null, sparklineData: [] };
      })
  );
};


export default async function OverviewPage({
    searchParams
}: {
    searchParams?: { country?: string; startDate?: string; endDate?: string; };
}) {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier = userSessionData?.activePlanTier || 'free';
  const isLoggedIn = !!session?.user;
  const favoriteIndicatorIdsFromSession: string[] = userSessionData?.favoriteIndicatorIds || [];

  const country = searchParams?.country || 'US';
  const dateRange = { startDate: searchParams?.startDate, endDate: searchParams?.endDate };

  const [
    summaryData,
    marketSnapshotData,
    favoritesInitialData,
    lowRiskData,
    moderateRiskData,
    highRiskData
  ] = await Promise.all([
    fetchDataForIndicatorList(headlineIndicatorIds, country, dateRange),
    fetchDataForIndicatorList(marketSnapshotIndicatorIds, country, dateRange, true),
    (isLoggedIn && (userTier === 'basic' || userTier === 'pro') && favoriteIndicatorIdsFromSession.length > 0)
        ? fetchDataForIndicatorList(favoriteIndicatorIdsFromSession.slice(0, MAX_FAVORITES_ON_OVERVIEW), country, dateRange)
        : Promise.resolve([]),
    fetchDataForIndicatorList(lowRiskAssetIds, country, dateRange, true),
    fetchDataForIndicatorList(moderateRiskAssetIds, country, dateRange, true),
    fetchDataForIndicatorList(highRiskAssetIds, country, dateRange, true)
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
                <CardTitle className="text-lg sm:text-xl text-primary">Unlock an Edge with EcoDash Pro!</CardTitle>
              </div>
              <Link href="/pricing" className="mt-2 sm:mt-0 flex-shrink-0">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">Explore Pro Features</Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0 sm:pt-1"><p className="text-sm text-muted-foreground">Elevate your analysis with Indicator Comparison, full historical data, data exports, advanced analytics, and more.</p></CardContent>
          </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {favoritesSnippetData.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-foreground flex items-center"><Star className="h-5 w-5 mr-2 text-amber-400 fill-amber-400"/> My Favorites</h2>
                <Link href="/favorites"><Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">View All →</Button></Link>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${favoritesSnippetData.length >= 3 ? 'xl:grid-cols-3' : `xl:grid-cols-${favoritesSnippetData.length || 1}`} gap-4`}>
                {favoritesSnippetData.map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={`fav-${indicator.id}`} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData} />
                ))}
              </div>
            </section>
          )}
          <section>
            {(favoritesSnippetData.length > 0) && <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>}
            {!favoritesSnippetData.length && <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {summaryData.length > 0 ? (
                  summaryData
                      .filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id))
                      .map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={indicator.id} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData}/> ))
              ) : ( <p className="col-span-full text-center text-muted-foreground py-8">No key indicators to display.</p> )}
              {summaryData.length > 0 && summaryData.filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id)).length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">Key indicators are currently unavailable.</p> )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 mt-6 md:mt-8 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" /> Asset Risk Spectrum
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base font-medium flex items-center text-green-600 dark:text-green-500">
                    <Shield className="h-4 w-4 mr-2" /> Low Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pt-1 pb-2 space-y-1">
                  {lowRiskData.length > 0 ? lowRiskData.map(asset => (
                    <AssetRiskItem key={`low-${asset.indicator.id}`} {...asset} changePeriodLabel="7D" changeValue={asset.change7D} />
                  )) : <p className="text-xs text-muted-foreground p-2">Data unavailable.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base font-medium flex items-center text-blue-600 dark:text-blue-500">
                    <TrendingUp className="h-4 w-4 mr-2" /> Moderate Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pt-1 pb-2 space-y-1">
                  {moderateRiskData.length > 0 ? moderateRiskData.map(asset => (
                    <AssetRiskItem key={`mod-${asset.indicator.id}`} {...asset} changePeriodLabel="7D" changeValue={asset.change7D}/>
                  )) : <p className="text-xs text-muted-foreground p-2">Data unavailable.</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base font-medium flex items-center text-red-600 dark:text-red-500">
                    <TrendingDownIcon className="h-4 w-4 mr-2" /> High Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pt-1 pb-2 space-y-1">
                  {highRiskData.length > 0 ? highRiskData.map(asset => (
                    <AssetRiskItem key={`high-${asset.indicator.id}`} {...asset} changePeriodLabel="7D" changeValue={asset.change7D}/>
                  )) : <p className="text-xs text-muted-foreground p-2">Data unavailable.</p>}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1 space-y-6 md:space-y-8">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg font-semibold flex items-center"><Zap className="h-5 w-5 mr-2 text-blue-500"/>Market Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {marketSnapshotData.length > 0 && marketSnapshotData.some(d => d.latestValue) ? marketSnapshotData.filter(d => d.latestValue).map(({indicator, latestValue, previousValue, change7D}) => {
                  let TrendIconWidget = FaMinus; let trendColorWidget = 'text-muted-foreground';
                  // Use change7D if available, otherwise fallback to previousValue for 1-period change
                  const effectiveChange = change7D !== null && change7D !== undefined ? change7D :
                    (latestValue?.value !== null && latestValue?.value !== undefined &&
                     previousValue?.value !== null && previousValue?.value !== undefined && previousValue.value !== 0)
                    ? ((latestValue.value - previousValue.value) / Math.abs(previousValue.value)) * 100
                    : null;

                  if (effectiveChange !== null) {
                      if (effectiveChange > 0) { TrendIconWidget = FaArrowUp; trendColorWidget = 'text-[hsl(var(--chart-green))]'; }
                      else if (effectiveChange < 0) { TrendIconWidget = FaArrowDown; trendColorWidget = 'text-[hsl(var(--chart-red))]'; }
                  }
                  const categoryInfo = Object.values(indicatorCategories).find(c=>c.key === indicator.categoryKey);
                  const indicatorLink = categoryInfo ? `/category/${categoryInfo.slug}?indicator=${indicator.id}` : '/';
                  return (
                    <Link href={indicatorLink} key={`snap-${indicator.id}`} className="block p-2.5 rounded-md hover:bg-muted/50 transition-colors group border-b border-border/30 last:border-b-0">
                        <div className="flex justify-between items-center"><span className="text-sm font-medium text-foreground group-hover:text-primary">{indicator.name.replace(' (FRED)', '').replace(' (USD)', '').replace(' Index','')}</span><TrendIconWidget className={`h-3 w-3 ${trendColorWidget} flex-shrink-0`} /></div>
                        <div className="text-lg font-semibold text-foreground">{latestValue?.value?.toLocaleString(undefined, { minimumFractionDigits: indicator.id === 'CRYPTO_FEAR_GREED' ? 0 : (indicator.unit === '%' ? 1:0), maximumFractionDigits: 2 }) ?? 'N/A'}<span className="text-xs ml-1 text-muted-foreground">{indicator.unit !== 'Index (0-100)' ? indicator.unit : ''}</span></div>
                        {effectiveChange !== null && <div className={`text-xs font-medium ${trendColorWidget}`}>{`${effectiveChange > 0 ? '+' : ''}${effectiveChange.toFixed(1)}% (${change7D !== null && change7D !== undefined ? '7D' : 'Prev'})`}</div> }
                    </Link>
                  );
              }) : <p className="text-sm text-muted-foreground p-2.5">Snapshot data unavailable.</p>}
            </CardContent>
          </Card>
          <NewsFeedWidget itemCount={5} defaultCategory="business" defaultCountry="us" />
          <EconomicCalendarWidget daysAhead={7} itemCount={4} />
          <EarningsCalendarWidget daysAhead={7} itemCount={5} />
        </aside>
      </div>
    </div>
  );
}