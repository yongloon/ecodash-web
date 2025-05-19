// src/app/(dashboard)/page.tsx
// ... (all existing imports remain the same) ...
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata, indicatorCategories, getCategoryBySlug } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import { fetchNewsHeadlines, fetchEconomicCalendar, fetchAlphaVantageEarningsCalendar, NewsArticle, EconomicEvent, EarningsEventAV } from '@/lib/api';

// UI Components
import SummaryCard from '@/components/dashboard/SummaryCard';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget';
import EconomicCalendarWidget from '@/components/dashboard/EconomicCalendarWidget';
import EarningsCalendarWidget from '@/components/dashboard/EarningsCalendarWidget';
import AssetRiskCategoryCard, { KeyIndicatorDisplayInfo } from '@/components/dashboard/AssetRiskCategoryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gem, Star, TrendingUp, Zap, Newspaper, CalendarDays, Briefcase, Shield, Activity, Scale, TrendingDown } from 'lucide-react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { subDays, format, parseISO, isValid, differenceInDays } from 'date-fns';


export const revalidate = 300;

// Configuration for Overview Page
// UPDATED: Added more indicators to headlineIndicatorIds
const headlineIndicatorIds = [
    'GDP_NOMINAL',          // NEW
    'UNRATE',
    'CPI_YOY_PCT',
    'FEDFUNDS',
    'PMI',
    'RETAIL_SALES_MOM_PCT',
    'US10Y',
    'SP500',
    'M2_YOY_PCT',           // This makes it 9
];
const marketSnapshotIndicatorIds = ['SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'OIL_WTI', 'GOLD_PRICE']; // OIL_WTI & GOLD_PRICE added for more snapshot diversity
const MAX_FAVORITES_ON_OVERVIEW = 3; // Keep this as is or adjust if desired

// ... (riskSpectrumSetup remains the same)
const riskSpectrumSetup = [
  {
    title: "🟢 Low-Risk Assets",
    iconLucide: Shield, // Keep or change icon as desired
    description: "Typically less volatile; often sought for capital preservation or income during uncertainty. Sensitive to interest rate changes.",
    keyIndicatorsConfig: [
      {
        id: 'TLT_ETF', // NEW - Assumes you'll create this IndicatorMetadata for iShares 20+ Year Treasury Bond ETF
        explanation: "Tracks long-term U.S. Treasury bonds. Price generally moves inversely to long-term interest rates."
      },
      {
        id: 'LQD_ETF', // Existing - iShares Investment Grade Corporate Bond ETF
        explanation: "Tracks investment-grade corporate bonds, offering higher yields than Treasuries with moderate credit risk."
      },
      {
        id: 'GOLD_PRICE', // Assuming you want the chartable historical gold price here
        explanation: "Traditionally seen as a store of value and hedge against inflation or geopolitical risk."
      },
      // You can add a 4th if desired, or keep it at 3.
      // { id: 'US10Y', explanation: "Benchmark 10-year Treasury yield; influences borrowing costs and reflects economic outlook." },
    ]
  },
  {
    title: "⚖️ Medium-Risk Assets",
    iconLucide: Scale, // Keep or change icon
    description: "Generally offer a balance of potential income and growth; moderately affected by economic cycles and broad market sentiment.",
    keyIndicatorsConfig: [
      {
        id: 'SP500', // Existing or 'SPX500_INDEX' if you created a separate one
        explanation: "Tracks 500 large-cap U.S. stocks, representing broad market performance and economic health."
      },
      {
        id: 'VNQ_ETF', // Existing - Vanguard Real Estate ETF
        explanation: "Represents diversified real estate investments (REITs), sensitive to interest rates and economic growth."
      },
      {
        id: 'PLATINUM_PRICE', // Assuming you want the chartable historical platinum price
        explanation: "Industrial precious metal, price influenced by automotive demand (catalytic converters) and industrial output."
      },
      // { id: 'LAND_REIT', explanation: "Farmland REIT, offering potential inflation hedging and unique asset class exposure." }, // Example of a 4th
    ]
  },
  {
    title: "🚀 High-Risk Assets",
    iconLucide: TrendingUp, // Keep or change icon
    description: "Can offer high growth potential but come with greater volatility; highly sensitive to market sentiment, liquidity, and risk appetite.",
    keyIndicatorsConfig: [
      {
        id: 'ARKK_ETF', // Existing - ARK Innovation ETF
        explanation: "Invests in speculative, disruptive innovation companies, known for high growth potential and volatility."
      },
      {
        id: 'BTC_PRICE_USD', // Existing - Bitcoin (USD)
        explanation: "Highly volatile cryptocurrency, driven by adoption, sentiment, and macroeconomic factors."
      },
      {
        id: 'TQQQ_ETF', // NEW - Assumes you'll create this IndicatorMetadata for ProShares UltraPro QQQ (3x Nasdaq 100)
        explanation: "Leveraged ETF seeking 3x daily return of the Nasdaq-100 Index, inherently very high risk and volatility."
      },
    ]
  }
];


// ... (getSparklineDataLength function remains the same)
const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30;
    if (frequency === 'Monthly') return 12;
    if (frequency === 'Quarterly') return 8;
    return 15;
};

// ... (fetchDataForRiskAndSummaryLists function remains the same as the version with the fix for 'id is not defined')
const fetchDataForRiskAndSummaryLists = async (
    ids: string[],
    country: string,
    dateRange: { startDate?: string; endDate?: string },
    fetchExtraForChanges: boolean = false
): Promise<Array<{
    indicator: IndicatorMetadata;
    latestValue: TimeSeriesDataPoint | null;
    previousValue: TimeSeriesDataPoint | null;
    sparklineData: TimeSeriesDataPoint[];
    currentValueDisplay: string;
    trendIconName?: 'up' | 'down' | 'neutral';
    trendColor?: string;
    change7D?: number | null;
}>> => {
  if (!ids || ids.length === 0) return [];

  const indicatorsWithOriginalId = ids.map(id => ({ originalId: id, indicator: getIndicatorById(id) }));

  return Promise.all(
      indicatorsWithOriginalId
      .filter(item => {
          if (!item.indicator) {
              console.warn(`[OverviewPage Fetch Helper] Indicator ID not found during list fetch: ${item.originalId}`);
              return false;
          }
          return true;
      })
      .map(async ({ indicator }) => {
          const isGlobalAsset = [
            'SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GOLD_PRICE', 'PLATINUM_PRICE',
            'KO_STOCK', 'XLU_ETF', 'LQD_ETF', 'VNQ_ETF', 'LAND_REIT',
            'ETH_PRICE_USD', 'OIL_WTI', 'ARKK_ETF',
            'US10Y', 'T10Y2Y_SPREAD', 'VIX', 'M2_YOY_PCT',
            'PMI', 'PMI_SERVICES', // These might be international if using DBNOMICS
            // FEDFUNDS, CCI, CPI_YOY_PCT, GDP_GROWTH, UNRATE, RETAIL_SALES_MOM_PCT are typically US-specific
            // but their fetching is handled by `country === 'US'` or `indicator.apiSource === 'Mock'`
          ].includes(indicator.id);
          const shouldFetch = country === 'US' || indicator.apiSource === 'Mock' || isGlobalAsset;

          let latestValue: TimeSeriesDataPoint | null = null;
          let previousValue: TimeSeriesDataPoint | null = null;
          let sparklineData: TimeSeriesDataPoint[] = [];
          let currentValueDisplay = "N/A";
          let trendIconName: 'up' | 'down' | 'neutral' | undefined;
          let trendColor: string | undefined;
          let change7D: number | null = null;

          if (shouldFetch) {
              let historyFetchRange = { ...dateRange };
              if (fetchExtraForChanges && indicator.frequency === 'Daily') {
                const today = new Date();
                historyFetchRange.startDate = format(subDays(today, 40), 'yyyy-MM-dd');
                historyFetchRange.endDate = format(today, 'yyyy-MM-dd');
              }

              const historicalData = await fetchIndicatorData(indicator, historyFetchRange);
              latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
              previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;

              if (latestValue?.value !== null && latestValue?.value !== undefined) {
                currentValueDisplay = `${latestValue.value.toLocaleString(undefined, {
                    minimumFractionDigits: indicator.unit === '%' ? 2 : (indicator.unit?.toLowerCase().includes('usd') || indicator.unit?.toLowerCase().includes('per ounce') ? 2 : 0),
                    maximumFractionDigits: indicator.unit === '%' ? 2 : (indicator.unit?.toLowerCase().includes('usd') || indicator.unit?.toLowerCase().includes('per ounce') ? 2 : (['BTC_PRICE_USD', 'ETH_PRICE_USD'].includes(indicator.id) ? 0 : 2)),
                })}`;

                if (previousValue?.value !== null && previousValue?.value !== undefined) {
                    if (latestValue.value > previousValue.value) { trendIconName = 'up'; trendColor = 'text-[hsl(var(--chart-green))]'; }
                    else if (latestValue.value < previousValue.value) { trendIconName = 'down'; trendColor = 'text-[hsl(var(--chart-red))]'; }
                    else { trendIconName = 'neutral'; trendColor = 'text-muted-foreground'; }
                }
              }

              if (fetchExtraForChanges && latestValue?.date && latestValue.value !== null && historicalData.length > 0 && indicator.frequency === 'Daily') {
                const findValueDaysAgo = (days: number) => {
                    const latestDate = parseISO(latestValue!.date!);
                    const targetDate = subDays(latestDate, days);
                    let closestPoint: TimeSeriesDataPoint | undefined = undefined; let minAbsDiff = Infinity;
                    for (let i = historicalData.length - 1; i >= 0; i--) {
                        const point = historicalData[i]; if (point.date === latestValue!.date! || !point.value) continue;
                        const pointDate = parseISO(point.date); if (pointDate > latestDate) continue;
                        const currentAbsDiff = Math.abs(differenceInDays(targetDate, pointDate));
                        if (currentAbsDiff < minAbsDiff) { minAbsDiff = currentAbsDiff; closestPoint = point; }
                        else if (currentAbsDiff === minAbsDiff && pointDate > parseISO(closestPoint!.date)) { closestPoint = point; }
                        if (pointDate < subDays(targetDate, days) && minAbsDiff <= days/2 ) break;
                    } return closestPoint;
                };
                const value7DaysAgo = findValueDaysAgo(7);
                if (value7DaysAgo?.value && latestValue.value) {
                    change7D = ((latestValue.value - value7DaysAgo.value) / Math.abs(value7DaysAgo.value === 0 ? 1 : value7DaysAgo.value)) * 100;
                }
              }
              const sparklineLength = getSparklineDataLength(indicator.frequency);
              sparklineData = historicalData.slice(Math.max(0, historicalData.length - sparklineLength));
          }
          return { indicator, latestValue, previousValue, sparklineData, currentValueDisplay, trendIconName, trendColor, change7D };
      })
  );
};


// ... (OverviewPage component itself remains the same from where it was last fully provided)
export default async function OverviewPage({ searchParams }: { searchParams?: { country?: string; startDate?: string; endDate?: string; }; }) {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier = userSessionData?.activePlanTier || 'free';
  const isLoggedIn = !!session?.user;
  const favoriteIndicatorIdsFromSession: string[] = userSessionData?.favoriteIndicatorIds || [];
  const country = searchParams?.country || 'US';
  const dateRange = { startDate: searchParams?.startDate, endDate: searchParams?.endDate };

  const allRiskSpectrumIndicatorIds = Array.from(new Set(
    riskSpectrumSetup.flatMap(category => category.keyIndicatorsConfig.map(ind => ind.id))
  ));

  const newsArticlesPromise = fetchNewsHeadlines('business', 'us', 5);
  const economicEventsPromise = fetchEconomicCalendar(30);
  const earningsEventsPromise = fetchAlphaVantageEarningsCalendar('3month', undefined);

  const [
    summaryData,
    marketSnapshotData,
    favoritesInitialData,
    riskSpectrumFetchedData,
    newsArticles,
    economicEvents,
    earningsEvents
  ] = await Promise.all([
    fetchDataForRiskAndSummaryLists(headlineIndicatorIds, country, dateRange),
    fetchDataForRiskAndSummaryLists(marketSnapshotIndicatorIds, country, dateRange, true),
    (isLoggedIn && (userTier === 'basic' || userTier === 'pro') && favoriteIndicatorIdsFromSession.length > 0)
        ? fetchDataForRiskAndSummaryLists(favoriteIndicatorIdsFromSession.slice(0, MAX_FAVORITES_ON_OVERVIEW), country, dateRange)
        : Promise.resolve([]),
    fetchDataForRiskAndSummaryLists(allRiskSpectrumIndicatorIds, country, dateRange),
    newsArticlesPromise,
    economicEventsPromise,
    earningsEventsPromise,
  ]);

  const favoritesSnippetData = favoritesInitialData;

  const processedRiskSpectrumDisplayData = riskSpectrumSetup.map(categoryConfig => {
    const indicatorsDisplayData: KeyIndicatorDisplayInfo[] = categoryConfig.keyIndicatorsConfig
      .map(cfg => {
        const fetchedIndData = riskSpectrumFetchedData.find(d => d.indicator.id === cfg.id);
        const indicatorMeta = getIndicatorById(cfg.id);
        if (!indicatorMeta) return null;

        const categoryInfo = getCategoryBySlug(indicatorMeta.categoryKey);
        const link = (categoryInfo)
          ? `/category/${categoryInfo.slug}?indicator=${indicatorMeta.id}`
          : `/dashboard`;

        return {
          id: cfg.id,
          name: indicatorMeta.name,
          unit: indicatorMeta.unit || '',
          link: link,
          currentValueDisplay: fetchedIndData?.currentValueDisplay || "N/A",
          trendIconName: fetchedIndData?.trendIconName,
          trendColor: fetchedIndData?.trendColor,
          explanation: cfg.explanation,
        };
      })
      .filter((item): item is KeyIndicatorDisplayInfo => item !== null);
      
    return { ...categoryConfig, indicatorsDisplayData };
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
      </div>
       {isLoggedIn && (userTier === 'free' || userTier === 'basic') && (
          <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
            <CardHeader className="pb-3 sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2"> <Gem className="h-6 w-6 text-primary flex-shrink-0" /> <CardTitle className="text-lg sm:text-xl text-primary">Unlock an Edge with EcoDash Pro!</CardTitle> </div>
              <Link href="/pricing" className="mt-2 sm:mt-0 flex-shrink-0"> <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">Explore Pro Features</Button> </Link>
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
            {(favoritesSnippetData.length > 0 || riskSpectrumSetup.some(cat => cat.indicatorsDisplayData.length > 0)) && <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>}
            {!(favoritesSnippetData.length > 0 || riskSpectrumSetup.some(cat => cat.indicatorsDisplayData.length > 0)) && <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"> {/* MODIFIED: md:grid-cols-3, removed lg:grid-cols-4 */}
              {summaryData.length > 0 ? (
                  summaryData
                      .filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id))
                      .slice(0, 9) // ADDED: Ensure only up to 9 indicators are mapped
                      .map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={indicator.id} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData}/> ))
              ) : ( <p className="col-span-full text-center text-muted-foreground py-8">No key indicators to display.</p> )}
              {summaryData.length > 0 && summaryData.filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id)).slice(0, 9).length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">Key indicators are currently unavailable for the selected criteria.</p> )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 mt-6 md:mt-8 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" /> Asset Risk Insights
            </h2>
            <div className="space-y-6">
              {processedRiskSpectrumDisplayData.map(category => {
                if (category.indicatorsDisplayData.length === 0) return null;
                return (
                  <AssetRiskCategoryCard
                    key={category.title}
                    title={category.title}
                    description={category.description}
                    indicatorsDisplayData={category.indicatorsDisplayData}
                  />
                );
                })}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1 space-y-6 md:space-y-8">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg font-semibold flex items-center"><Zap className="h-5 w-5 mr-2 text-blue-500"/>Market Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {marketSnapshotData.length > 0 && marketSnapshotData.some(d => d.latestValue) ? marketSnapshotData.filter(d => d.latestValue).map(({indicator, latestValue, previousValue, change7D, trendIconName: initialTrendIconName, trendColor: initialTrendColor}) => {
                  let trendIconNameToUse = initialTrendIconName;
                  let trendColorForSnapshot = initialTrendColor || 'text-muted-foreground';
                  let displayChangeValue = previousValue && latestValue?.value != null && previousValue?.value != null && previousValue.value !== 0 ? (((latestValue.value - previousValue.value) / Math.abs(previousValue.value)) * 100) : ( latestValue?.value != null && previousValue?.value === 0 && latestValue.value !==0 ? Infinity : null);
                  let displayChangeLabel = "Prev";

                  if (change7D !== null && change7D !== undefined) {
                      displayChangeValue = change7D;
                      displayChangeLabel = "7D";
                      if (change7D > 0) { trendIconNameToUse = 'up'; trendColorForSnapshot = 'text-[hsl(var(--chart-green))]'; }
                      else if (change7D < 0) { trendIconNameToUse = 'down'; trendColorForSnapshot = 'text-[hsl(var(--chart-red))]'; }
                      else { trendIconNameToUse = 'neutral'; trendColorForSnapshot = 'text-muted-foreground'; }
                  } else if (displayChangeValue !== null && displayChangeValue !== Infinity) {
                      if (displayChangeValue > 0) { trendIconNameToUse = 'up'; trendColorForSnapshot = 'text-[hsl(var(--chart-green))]'; }
                      else if (displayChangeValue < 0) { trendIconNameToUse = 'down'; trendColorForSnapshot = 'text-[hsl(var(--chart-red))]'; }
                      else { trendIconNameToUse = 'neutral'; trendColorForSnapshot = 'text-muted-foreground'; }
                  } else if (displayChangeValue === Infinity) {
                      trendIconNameToUse = 'up'; trendColorForSnapshot = 'text-[hsl(var(--chart-green))]';
                  }

                  let TrendIconToRender = FaMinus;
                  if (trendIconNameToUse === 'up') TrendIconToRender = FaArrowUp;
                  else if (trendIconNameToUse === 'down') TrendIconToRender = FaArrowDown;

                  const categoryInfo = getCategoryBySlug(indicator.categoryKey);
                  let indicatorLink = '/dashboard'; // Default fallback
                  if (categoryInfo) {
                      indicatorLink = `/category/${categoryInfo.slug}?indicator=${indicator.id}`;
                  } else if (indicator.id) {
                      // Fallback to a sensible default category if direct categoryKey isn't found
                      // For market assets, 'financial-conditions' might be a good default if 'viii' isn't set explicitly on all of them
                      const financialCategory = getCategoryBySlug('financial-conditions'); // Assuming 'financial-conditions' is a valid slug for categoryKey 'viii'
                      if (financialCategory) {
                          indicatorLink = `/category/${financialCategory.slug}?indicator=${indicator.id}`;
                      } else {
                          console.warn(`Market Snapshot: Could not determine category link for ${indicator.id}. Defaulting to dashboard.`);
                      }
                  }

                  return (
                    <Link href={indicatorLink} key={`snap-${indicator.id}`} className="block p-2.5 rounded-md hover:bg-muted/50 transition-colors group border-b border-border/30 last:border-b-0">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground group-hover:text-primary truncate" title={indicator.name}>
                                {indicator.name.replace(' (FRED)', '').replace(' (USD)', '').replace(' Index','')}
                            </span>
                            <TrendIconToRender className={`h-3 w-3 ${trendColorForSnapshot} flex-shrink-0`} />
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                            {latestValue?.value?.toLocaleString(undefined, {
                                minimumFractionDigits: indicator.id === 'CRYPTO_FEAR_GREED' ? 0 : (indicator.unit === '%' ? 1:0),
                                maximumFractionDigits: 2
                            }) ?? 'N/A'}
                            <span className="text-xs ml-1 text-muted-foreground">
                                {indicator.unit !== 'Index (0-100)' ? indicator.unit : ''}
                            </span>
                        </div>
                        {displayChangeValue !== null && (
                            <div className={`text-xs font-medium ${trendColorForSnapshot}`}>
                                {displayChangeValue === Infinity ? '+∞%' : `${displayChangeValue > 0 ? '+' : ''}${displayChangeValue.toFixed(1)}%`} ({displayChangeLabel})
                            </div>
                        )}
                    </Link>
                  );
              }) : <p className="text-sm text-muted-foreground p-2.5">Snapshot data unavailable.</p>}
            </CardContent>
          </Card>
          <NewsFeedWidget initialNews={newsArticles} itemCount={5} />
          <EconomicCalendarWidget initialEvents={economicEvents} daysAhead={30} itemCount={4} />
          <EarningsCalendarWidget initialEvents={earningsEvents} horizon="3month" itemCount={5} />
        </aside>
      </div>
    </div>
  );
}