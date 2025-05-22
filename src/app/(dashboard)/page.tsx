// src/app/(dashboard)/page.tsx
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Ensure this path is correct
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata, indicatorCategories, getCategoryBySlug } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData'; // For fetching indicator data including sparklines
import {
  fetchNewsHeadlines,         // For NewsAPI
  fetchEconomicCalendar,      // For Finnhub Economic Calendar
  fetchAlphaVantageEarningsCalendar, // For Alpha Vantage Earnings
  fetchFredReleaseCalendar,   // For FRED Releases
  fetchAlphaVantageNewsSentiment, // Keep for consistency if you want it, or remove for MVP
  fetchAlphaVantageInsiderTransactions, // Keep for consistency, or remove for MVP
  NewsArticle,
  EconomicEvent,
  EarningsEventAV,
  FredReleaseDate,
  NewsSentimentArticle,
  InsiderTransaction
} from '@/lib/api'; // Ensure this path is correct

// UI Components
import SummaryCard from '@/components/dashboard/SummaryCard';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget';
import AlphaNewsSentimentWidget from '@/components/dashboard/AlphaNewsSentimentWidget'; // Optional for richer beta
import EconomicCalendarWidget from '@/components/dashboard/EconomicCalendarWidget';
import EarningsCalendarWidget from '@/components/dashboard/EarningsCalendarWidget';
import FredReleasesWidget from '@/components/dashboard/FredReleasesWidget';
import InsiderTransactionsWidget from '@/components/dashboard/InsiderTransactionsWidget'; // Optional for richer beta
import AssetRiskCategoryCard, { KeyIndicatorDisplayInfo } from '@/components/dashboard/AssetRiskCategoryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Star, TrendingUp, Zap, Shield, Activity, Scale, Newspaper, CalendarDays, Briefcase, ArrowRightLeft } from 'lucide-react'; // Added more icons
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { subDays, format, parseISO, isValid, differenceInDays } from 'date-fns';

// Revalidate this page e.g., every 5-10 minutes for a beta, or adjust as needed
export const revalidate = 600; // 10 minutes

// --- Indicator ID Configurations for the Dashboard ---
const KEY_INDICATORS_COUNT = 9;
const keyIndicatorIdsForOverview = [ // Choose 9 diverse and important ones
    'GDP_GROWTH', 'UNRATE', 'CPI_YOY_PCT', 'FEDFUNDS', 'PMI',
    'RETAIL_SALES_MOM_PCT', 'US10Y', 'SP500', 'OIL_WTI', // Example 9
];

const marketSnapshotIndicatorIds = ['SP500', 'BTC_PRICE_USD', 'VIX', 'OIL_WTI', 'GOLD_PRICE', 'US10Y']; // Example for market snapshot

const MAX_FAVORITES_ON_OVERVIEW = 3; // If keeping favorites snippet for beta

const riskSpectrumSetup = [ // Keeping this for "Asset Risk Insights"
  {
    title: "🟢 Low-Risk Assets Focus", iconLucide: Shield,
    description: "Indicators relevant to assets often considered lower risk or for capital preservation.",
    keyIndicatorsConfig: [
      { id: 'US10Y', explanation: "10-Year Treasury yield, benchmark for risk-free rate." },
      { id: 'LQD_ETF', explanation: "Investment-grade corporate bond ETF." },
      { id: 'GOLD_PRICE', explanation: "Traditionally a safe-haven asset." },
    ]
  },
  {
    title: "⚖️ Medium-Risk Assets Focus", iconLucide: Scale,
    description: "Indicators related to assets with a balance of risk and return potential.",
    keyIndicatorsConfig: [
      { id: 'SP500', explanation: "Broad U.S. stock market index." },
      { id: 'PMI', explanation: "Manufacturing health, impacts corporate earnings." },
      { id: 'VNQ_ETF', explanation: "Diversified real estate investments (REITs)." },
    ]
  },
  {
    title: "🚀 High-Risk Assets Focus", iconLucide: TrendingUp,
    description: "Indicators relevant to assets with higher volatility and growth potential.",
    keyIndicatorsConfig: [
      { id: 'VIX', explanation: "Market volatility index, 'fear gauge'." },
      { id: 'ARKK_ETF', explanation: "Speculative, disruptive innovation companies." },
      { id: 'BTC_PRICE_USD', explanation: "Highly volatile cryptocurrency." },
    ]
  },
];

// --- Helper Functions (from your original file, slightly adapted) ---
const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30;
    if (frequency === 'Monthly') return 12;
    if (frequency === 'Quarterly') return 8;
    return 15;
};

// Combined data fetching utility
const fetchDataForDashboardLists = async (
    ids: string[],
    country: string,
    dateRange: { startDate?: string; endDate?: string },
    fetchExtraFor7DChange: boolean = false // Parameter to control fetching extra data for 7-day change
): Promise<Array<{
    indicator: IndicatorMetadata;
    latestValue: TimeSeriesDataPoint | null;
    previousValue: TimeSeriesDataPoint | null;
    sparklineData: TimeSeriesDataPoint[];
    currentValueDisplay: string;
    trendIconName?: 'up' | 'down' | 'neutral';
    trendColor?: string;
    change7D?: number | null; // For Market Snapshot
}>> => {
  if (!ids || ids.length === 0) return [];

  return Promise.all(
      ids.map(id => getIndicatorById(id))
      .filter((indicator): indicator is IndicatorMetadata => {
          if (!indicator) { console.warn(`[DashboardData] Indicator not found: ${ids.find(idVal => !getIndicatorById(idVal))}`); return false; }
          return true;
      })
      .map(async (indicator) => {
          const isGlobalAsset = [ // Add more global assets if needed
            'SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GOLD_PRICE', 'SILVER_PRICE',
            'OIL_WTI', 'TLT_ETF', 'LQD_ETF', 'VNQ_ETF', 'ARKK_ETF', 'TQQQ_ETF',
            'US10Y', 'VIX', 'PMI'
          ].includes(indicator.id);
          const shouldFetch = country === 'US' || indicator.apiSource === 'Mock' || isGlobalAsset;

          let latestValue: TimeSeriesDataPoint | null = null;
          let previousValue: TimeSeriesDataPoint | null = null;
          let sparklineDataToUse: TimeSeriesDataPoint[] = [];
          let currentValueDisplay = "N/A";
          let trendIconName: 'up' | 'down' | 'neutral' | undefined;
          let trendColor: string | undefined;
          let change7D: number | null = null;

          if (shouldFetch) {
              let historyFetchRange = { ...dateRange };
              // If we need 7-day change, fetch more data for daily indicators
              if (fetchExtraFor7DChange && indicator.frequency === 'Daily') {
                  const today = new Date();
                  // Fetch last ~40 days to ensure we have data for 7 days ago + current + previous
                  historyFetchRange.startDate = format(subDays(today, 40), 'yyyy-MM-dd');
                  historyFetchRange.endDate = format(today, 'yyyy-MM-dd');
              }

              const fetchedData = await fetchIndicatorData(indicator, historyFetchRange);
              latestValue = fetchedData.length > 0 ? fetchedData[fetchedData.length - 1] : null;
              previousValue = fetchedData.length > 1 ? fetchedData[fetchedData.length - 2] : null;
              sparklineDataToUse = fetchedData;

              if (latestValue?.value !== null && latestValue?.value !== undefined) {
                  let minDigits = 0; let maxDigits = 2;
                  if (indicator.unit === '%') { minDigits = 1; maxDigits = 2; }
                  else if (indicator.unit?.toLowerCase().includes('usd') || indicator.unit?.toLowerCase().includes('ounce') || indicator.unit === 'Index Value') { minDigits = (indicator.id === 'BTC_PRICE_USD' || indicator.id === 'CRYPTO_FEAR_GREED') ? 0 : 2; maxDigits = 2;}
                  if (maxDigits < minDigits) maxDigits = minDigits;

                  currentValueDisplay = `${latestValue.value.toLocaleString(undefined, { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })}`;
                  if (previousValue?.value !== null && previousValue?.value !== undefined) {
                    if (latestValue.value > previousValue.value) { trendIconName = 'up'; trendColor = 'text-[hsl(var(--chart-green))]'; }
                    else if (latestValue.value < previousValue.value) { trendIconName = 'down'; trendColor = 'text-[hsl(var(--chart-red))]'; }
                    else { trendIconName = 'neutral'; trendColor = 'text-muted-foreground'; }
                  }
              }

              // Calculate 7-day change if requested
              if (fetchExtraFor7DChange && latestValue?.date && latestValue.value !== null && fetchedData.length > 0 && indicator.frequency === 'Daily') {
                const findValueDaysAgo = (days: number, sourceData: TimeSeriesDataPoint[]) => {
                    if (!latestValue?.date) return undefined;
                    const latestDate = parseISO(latestValue.date);
                    const targetDate = subDays(latestDate, days);
                    let closestPoint: TimeSeriesDataPoint | undefined = undefined;
                    let minAbsDiff = Infinity;

                    for (let i = sourceData.length - 1; i >= 0; i--) {
                        const point = sourceData[i];
                        if (!point.date || point.value === null || point.date === latestValue.date) continue;
                        const pointDate = parseISO(point.date);
                        if (!isValid(pointDate) || pointDate > latestDate) continue;

                        const currentAbsDiff = Math.abs(differenceInDays(targetDate, pointDate));
                        if (currentAbsDiff < minAbsDiff) {
                            minAbsDiff = currentAbsDiff;
                            closestPoint = point;
                        } else if (currentAbsDiff === minAbsDiff && closestPoint && pointDate > parseISO(closestPoint.date)) {
                            // Prefer newer point if diff is same
                            closestPoint = point;
                        }
                        // Optimization: if we've gone too far back and already found a decent match
                        if (pointDate < subDays(targetDate, Math.max(3, days / 2)) && minAbsDiff <= Math.max(1, days / 2 -1) ) break;
                    }
                    return closestPoint;
                };
                const value7DaysAgo = findValueDaysAgo(7, fetchedData);

                if (value7DaysAgo?.value && latestValue.value) {
                    change7D = ((latestValue.value - value7DaysAgo.value) / Math.abs(value7DaysAgo.value === 0 ? 1 : value7DaysAgo.value)) * 100;
                }
              }
              const sparklineLength = getSparklineDataLength(indicator.frequency);
              sparklineDataToUse = sparklineDataToUse.slice(Math.max(0, sparklineDataToUse.length - sparklineLength));
          }
          return { indicator, latestValue, previousValue, sparklineData: sparklineDataToUse, currentValueDisplay, trendIconName, trendColor, change7D };
      })
  );
};


// --- Main Page Component ---
export default async function OverviewPage({ searchParams }: { searchParams?: { country?: string; startDate?: string; endDate?: string; }; }) {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier = userSessionData?.activePlanTier || 'mvp_free'; // Default to MVP free tier
  const isLoggedIn = !!session?.user;
  // const favoriteIndicatorIdsFromSession: string[] = userSessionData?.favoriteIndicatorIds || []; // Defer favorites for MVP
  const country = searchParams?.country || 'US';
  const dateRange = { startDate: searchParams?.startDate, endDate: searchParams?.endDate };
  const DEFAULT_INSIDER_TICKER_FOR_OVERVIEW = "AAPL"; // Or remove if InsiderTransactionsWidget is deferred

  // Consolidate all data fetching
  const allRiskSpectrumIndicatorIds = Array.from(new Set( riskSpectrumSetup.flatMap(cat => cat.keyIndicatorsConfig.map(ind => ind.id)) ));

  const [
    keyIndicatorsData,
    marketSnapshotData,
    // favoritesInitialData, // Defer favorites for MVP
    riskSpectrumFetchedData,
    newsApiArticles,
    // alphaNewsArticles, // Defer Alpha News Sentiment for simpler MVP
    economicEvents,
    fredReleases,
    earningsEvents,
    // insiderTransactionsData, // Defer Insider Transactions for simpler MVP
  ] = await Promise.all([
    fetchDataForDashboardLists(keyIndicatorIdsForOverview, country, dateRange),
    fetchDataForDashboardLists(marketSnapshotIndicatorIds, country, dateRange, true), // Fetch extra for 7D change
    // (isLoggedIn /* && relevant_tier_for_favorites */ && favoriteIndicatorIdsFromSession.length > 0) // Defer
    //     ? fetchDataForDashboardLists(favoriteIndicatorIdsFromSession.slice(0, MAX_FAVORITES_ON_OVERVIEW), country, dateRange)
    //     : Promise.resolve([]),
    fetchDataForDashboardLists(allRiskSpectrumIndicatorIds, country, dateRange),
    fetchNewsHeadlines('business', 'us', 5), // NewsAPI
    // fetchAlphaVantageNewsSentiment(undefined, "economy,financial_markets,earnings", 3), // Defer
    fetchEconomicCalendar(30), // Finnhub
    fetchFredReleaseCalendar(30), // FRED
    fetchAlphaVantageEarningsCalendar('3month', undefined), // Alpha Vantage
    // fetchAlphaVantageInsiderTransactions(DEFAULT_INSIDER_TICKER_FOR_OVERVIEW, 5), // Defer
  ]);

  // Process data for Asset Risk Insights
  const processedRiskSpectrumDisplayData = riskSpectrumSetup.map(categoryConfig => {
    const indicatorsDisplayData: KeyIndicatorDisplayInfo[] = categoryConfig.keyIndicatorsConfig
      .map(cfg => {
        const fetchedIndData = riskSpectrumFetchedData.find(d => d.indicator.id === cfg.id);
        const indicatorMeta = getIndicatorById(cfg.id);
        if (!indicatorMeta) return null;
        const categoryInfo = getCategoryBySlug(indicatorMeta.categoryKey);
        const link = categoryInfo ? `/category/${categoryInfo.slug}?indicator=${indicatorMeta.id}` : `/`;
        return {
          id: cfg.id, name: indicatorMeta.name, unit: indicatorMeta.unit || '', link,
          currentValueDisplay: fetchedIndData?.currentValueDisplay || "N/A",
          trendIconName: fetchedIndData?.trendIconName, trendColor: fetchedIndData?.trendColor,
          explanation: cfg.explanation,
        };
      }).filter((item): item is KeyIndicatorDisplayInfo => item !== null);
    return { ...categoryConfig, indicatorsDisplayData };
  });

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
      </div>

    

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Favorites Snippet - Deferred for MVP
          {favoritesInitialData.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-foreground flex items-center"><Star className="h-5 w-5 mr-2 text-amber-400 fill-amber-400"/> My Favorites</h2>
                <Link href="/favorites"><Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">View All →</Button></Link>
              </div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${favoritesInitialData.length >= 3 ? 'md:grid-cols-3' : `md:grid-cols-${favoritesInitialData.length || 1}`} gap-4`}>
                {favoritesInitialData.map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={`fav-${indicator.id}`} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData} />
                ))}
              </div>
            </section>
          )}
          */}

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {keyIndicatorsData.length > 0 ? (
                  keyIndicatorsData
                      .slice(0, KEY_INDICATORS_COUNT) // Ensure we only show the defined count
                      .map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={indicator.id} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData}/> ))
              ) : ( <p className="col-span-full text-center text-muted-foreground py-8">No key indicators to display.</p> )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4 mt-6 md:mt-8 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" /> Asset Risk Insights
            </h2>
            <div className="space-y-6">
              {processedRiskSpectrumDisplayData.map(category => {
                if (category.indicatorsDisplayData.length === 0) return null;
                return ( <AssetRiskCategoryCard key={category.title} title={category.title} description={category.description} indicatorsDisplayData={category.indicatorsDisplayData} /> );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Widgets Area */}
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
                      displayChangeValue = change7D; displayChangeLabel = "7D";
                      if (change7D > 0) { trendIconNameToUse = 'up'; trendColorForSnapshot = 'text-[hsl(var(--chart-green))]'; }
                      else if (change7D < 0) { trendIconNameToUse = 'down'; trendColorForSnapshot = 'text-[hsl(var(--chart-red))]'; }
                      else { trendIconNameToUse = 'neutral'; trendColorForSnapshot = 'text-muted-foreground'; }
                  } else if (displayChangeValue !== null && displayChangeValue !== Infinity) { /* Existing logic for Prev change */ }

                  let TrendIconToRender = FaMinus;
                  if (trendIconNameToUse === 'up') TrendIconToRender = FaArrowUp;
                  else if (trendIconNameToUse === 'down') TrendIconToRender = FaArrowDown;

                  const categoryInfo = getCategoryBySlug(indicator.categoryKey);
                  const indicatorLink = categoryInfo ? `/category/${categoryInfo.slug}?indicator=${indicator.id}` : `/`;

                  return (
                    <Link href={indicatorLink} key={`snap-${indicator.id}`} className="block p-2.5 rounded-md hover:bg-muted/50 transition-colors group border-b border-border/30 last:border-b-0">
                        {/* ... (rest of your market snapshot item rendering - seems fine) ... */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground group-hover:text-primary truncate" title={indicator.name}>
                                {indicator.name.replace(' (FRED)', '').replace(' (USD)', '').replace(' Index','').replace(' (Historical)', '')}
                            </span>
                            <TrendIconToRender className={`h-3 w-3 ${trendColorForSnapshot} flex-shrink-0`} />
                        </div>
                        <div className="text-lg font-semibold text-foreground">
                            {latestValue?.value?.toLocaleString(undefined, {
                                minimumFractionDigits: indicator.id === 'CRYPTO_FEAR_GREED' ? 0 : (indicator.unit === '%' ? 1: (indicator.id === 'GOLD_PRICE' || indicator.id === 'SILVER_PRICE' ? 2 : 0)),
                                maximumFractionDigits: 2
                            }) ?? 'N/A'}
                            <span className="text-xs ml-1 text-muted-foreground">
                                {indicator.unit !== 'Index (0-100)' && indicator.unit !== 'Index Value' && indicator.unit !== 'USD per Ounce' ? indicator.unit : ''}
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

          <NewsFeedWidget initialNews={newsApiArticles} itemCount={5} />
          {/* <AlphaNewsSentimentWidget initialArticles={alphaNewsArticles} itemCount={3} title="Market Sentiment News"/> Defer for simpler MVP */}
         {/*  <EconomicCalendarWidget initialEvents={economicEvents} daysAhead={30} itemCount={4} /> */}
          <FredReleasesWidget initialReleases={fredReleases} itemCount={5} />
          <EarningsCalendarWidget initialEvents={earningsEvents} horizon="3month" itemCount={5} />
          {/* <InsiderTransactionsWidget initialTransactions={insiderTransactionsData} itemCount={5} /> Defer for simpler MVP */}
        </aside>
      </div>
    </div>
  );
}