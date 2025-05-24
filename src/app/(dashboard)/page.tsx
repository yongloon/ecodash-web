// File: src/app/(dashboard)/page.tsx
// src/app/(dashboard)/page.tsx
import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions, AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata, indicatorCategories, getCategoryBySlug } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import {
  fetchNewsHeadlines, 
  fetchEconomicCalendar, 
  fetchAlphaVantageEarningsCalendar,
  fetchFredReleaseCalendar, 
  fetchAlphaVantageNewsSentiment,     
  fetchAlphaVantageInsiderTransactions, 
  NewsArticle, 
  EconomicEvent,
  EarningsEventAV,
  FredReleaseDate,
  NewsSentimentArticle,            
  InsiderTransaction                
} from '@/lib/api';

// UI Components
import SummaryCard from '@/components/dashboard/SummaryCard';
import NewsFeedWidget from '@/components/dashboard/NewsFeedWidget'; 
import AlphaNewsSentimentWidget from '@/components/dashboard/AlphaNewsSentimentWidget'; 
import EconomicCalendarWidget from '@/components/dashboard/EconomicCalendarWidget';
import EarningsCalendarWidget from '@/components/dashboard/EarningsCalendarWidget';
import FredReleasesWidget from '@/components/dashboard/FredReleasesWidget';
import InsiderTransactionsWidget from '@/components/dashboard/InsiderTransactionsWidget';
import AssetRiskCategoryCard, { KeyIndicatorDisplayInfo } from '@/components/dashboard/AssetRiskCategoryCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gem, Star, TrendingUp, Zap, Shield, Activity, Scale } from 'lucide-react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { subDays, format, parseISO, isValid, differenceInDays } from 'date-fns';


export const revalidate = 300; 

const headlineIndicatorIds = [
    'GDP_NOMINAL', 'UNRATE', 'CPI_YOY_PCT', 'FEDFUNDS', 'PMI', 
    'RETAIL_SALES_MOM_PCT', 'US10Y', 'SP500', 'M2_YOY_PCT',
];
const marketSnapshotIndicatorIds = ['SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'OIL_WTI', 'GOLD_PRICE', 'SILVER_PRICE'];
const MAX_FAVORITES_ON_OVERVIEW = 3;

const riskSpectrumSetup = [
  {
    title: "🟢 Low-Risk Assets", iconLucide: Shield,
    description: "Typically less volatile; often sought for capital preservation or income during uncertainty. Sensitive to interest rate changes.",
    keyIndicatorsConfig: [
      { id: 'TLT_ETF', explanation: "Tracks long-term U.S. Treasury bonds." },
      { id: 'LQD_ETF', explanation: "Tracks investment-grade corporate bonds." },
      { id: 'GOLD_PRICE', explanation: "Spot Gold Price (via Tiingo)." },
    ]
  },
  {
    title: "⚖️ Medium-Risk Assets", iconLucide: Scale,
    description: "Generally offer a balance of potential income and growth; moderately affected by economic cycles.",
    keyIndicatorsConfig: [
      { id: 'SP500', explanation: "Tracks 500 large-cap U.S. stocks." },
      { id: 'VNQ_ETF', explanation: "Represents diversified real estate investments (REITs)." },
      { id: 'SILVER_PRICE', explanation: "Spot Silver Price (via Tiingo)." },
    ]
  },
  {
    title: "🚀 High-Risk Assets", iconLucide: TrendingUp,
    description: "Can offer high growth potential but come with greater volatility; highly sensitive to market sentiment.",
    keyIndicatorsConfig: [
      { id: 'ARKK_ETF', explanation: "Invests in speculative, disruptive innovation companies." },
      { id: 'BTC_PRICE_USD', explanation: "Highly volatile cryptocurrency." },
      { id: 'TQQQ_ETF', explanation: "Leveraged ETF seeking 3x daily return of the Nasdaq-100." },
    ]
  },
];

const getSparklineDataLength = (frequency?: string): number => {
    if (frequency === 'Daily' || frequency === 'Weekly') return 30;
    if (frequency === 'Monthly') return 12;
    if (frequency === 'Quarterly') return 8;
    return 15;
};

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
          if (!item.indicator) { return false; }
          return true;
      })
      .map(async ({ indicator }) => { 
          const isGlobalAsset = [ 
            'SP500', 'BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'GOLD_PRICE', 'SILVER_PRICE', 
            'OIL_WTI', 'TLT_ETF', 'LQD_ETF', 'VNQ_ETF', 'ARKK_ETF', 'TQQQ_ETF',
            'US10Y', 'VIX', 'M2_YOY_PCT', 'PMI' 
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
              let mainFetchedData: TimeSeriesDataPoint[] = [];

              if (fetchExtraForChanges && indicator.frequency === 'Daily') {
                  const today = new Date();
                  historyFetchRange.startDate = format(subDays(today, 40), 'yyyy-MM-dd');
                  historyFetchRange.endDate = format(today, 'yyyy-MM-dd');
              }
              mainFetchedData = await fetchIndicatorData(indicator, historyFetchRange);
              latestValue = mainFetchedData.length > 0 ? mainFetchedData[mainFetchedData.length - 1] : null;
              previousValue = mainFetchedData.length > 1 ? mainFetchedData[mainFetchedData.length - 2] : null;
              sparklineDataToUse = mainFetchedData; 
              
              if (latestValue?.value !== null && latestValue?.value !== undefined) {
                  let minDigits = 0; let maxDigits = 2;
                  if (indicator.unit === '%') { minDigits = 1; maxDigits = 2; } 
                  else if (indicator.unit?.toLowerCase().includes('usd') || indicator.unit?.toLowerCase().includes('ounce') || indicator.unit === 'Index Value') { minDigits = 2; maxDigits = 2; }
                  if (indicator.id === 'BTC_PRICE_USD' || indicator.id === 'ETH_PRICE_USD' || indicator.id === 'CRYPTO_FEAR_GREED') { minDigits = 0; maxDigits = 0;} 
                  else if (indicator.id === 'GOLD_PRICE' || indicator.id === 'SILVER_PRICE') { minDigits = 2; maxDigits = 2; }
                  if (maxDigits < minDigits) maxDigits = minDigits;
                  currentValueDisplay = `${latestValue.value.toLocaleString(undefined, { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits, })}`;
                  if (previousValue?.value !== null && previousValue?.value !== undefined) {
                    if (latestValue.value > previousValue.value) { trendIconName = 'up'; trendColor = 'text-[hsl(var(--chart-green))]'; }
                    else if (latestValue.value < previousValue.value) { trendIconName = 'down'; trendColor = 'text-[hsl(var(--chart-red))]'; }
                    else { trendIconName = 'neutral'; trendColor = 'text-muted-foreground'; }
                  }
              }
              
              const dataFor7DChange = mainFetchedData;
              if (fetchExtraForChanges && latestValue?.date && latestValue.value !== null && dataFor7DChange.length > 0 && indicator.frequency === 'Daily') {
                const findValueDaysAgo = (days: number, sourceData: TimeSeriesDataPoint[]) => {
                    const latestDate = parseISO(latestValue!.date!); const targetDate = subDays(latestDate, days);
                    let closestPoint: TimeSeriesDataPoint | undefined = undefined; let minAbsDiff = Infinity;
                    for (let i = sourceData.length - 1; i >= 0; i--) {
                        const point = sourceData[i]; 
                        if (!point.date || point.value === null || point.date === latestValue!.date!) continue;
                        const pointDate = parseISO(point.date); 
                        if (!isValid(pointDate) || pointDate > latestDate) continue;
                        const currentAbsDiff = Math.abs(differenceInDays(targetDate, pointDate));
                        if (currentAbsDiff < minAbsDiff) { minAbsDiff = currentAbsDiff; closestPoint = point; } 
                        else if (currentAbsDiff === minAbsDiff && closestPoint && pointDate > parseISO(closestPoint.date)) { closestPoint = point; }
                        if (pointDate < subDays(targetDate, days / 2) && minAbsDiff <= days / 2) break;
                    } return closestPoint;
                };
                const value7DaysAgo = findValueDaysAgo(7, dataFor7DChange);
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

export default async function OverviewPage({ searchParams }: { searchParams?: { country?: string; startDate?: string; endDate?: string; }; }) {
  const session = await getServerSession(authOptions);
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier = userSessionData?.activePlanTier || 'free';
  const isLoggedIn = !!session?.user;
  const favoriteIndicatorIdsFromSession: string[] = userSessionData?.favoriteIndicatorIds || [];
  const country = searchParams?.country || 'US';
  const dateRange = { startDate: searchParams?.startDate, endDate: searchParams?.endDate };
  const DEFAULT_INSIDER_TICKER_FOR_OVERVIEW = "AAPL"; 

  const allRiskSpectrumIndicatorIds = Array.from(new Set( riskSpectrumSetup.flatMap(cat => cat.keyIndicatorsConfig.map(ind => ind.id)) ));
  
  const dataFetchTimestamp = new Date().toISOString();

  const newsApiHeadlinesPromise = fetchNewsHeadlines('business', 'us', 5);
  const alphaNewsPromise = fetchAlphaVantageNewsSentiment(undefined, "economy,financial_markets,earnings", 3); 
  const economicEventsPromise = fetchEconomicCalendar(30);
  const fredReleasesPromise = fetchFredReleaseCalendar(30);
  const earningsEventsPromise = fetchAlphaVantageEarningsCalendar('3month', undefined); 
  const insiderTradesPromise = fetchAlphaVantageInsiderTransactions(DEFAULT_INSIDER_TICKER_FOR_OVERVIEW, 5); 

  const [
    summaryData, marketSnapshotData, favoritesInitialData, riskSpectrumFetchedData,
    newsApiArticles, alphaNewsArticles, economicEvents, fredReleases, earningsEvents, insiderTransactionsData
  ] = await Promise.all([
    fetchDataForRiskAndSummaryLists(headlineIndicatorIds, country, dateRange),
    fetchDataForRiskAndSummaryLists(marketSnapshotIndicatorIds, country, dateRange, true),
    (isLoggedIn && (userTier === 'basic' || userTier === 'pro') && favoriteIndicatorIdsFromSession.length > 0)
        ? fetchDataForRiskAndSummaryLists(favoriteIndicatorIdsFromSession.slice(0, MAX_FAVORITES_ON_OVERVIEW), country, dateRange)
        : Promise.resolve([]),
    fetchDataForRiskAndSummaryLists(allRiskSpectrumIndicatorIds, country, dateRange),
    newsApiHeadlinesPromise, alphaNewsPromise, economicEventsPromise, fredReleasesPromise, earningsEventsPromise, insiderTradesPromise,
  ]);

  const favoritesSnippetData = favoritesInitialData;
  const processedRiskSpectrumDisplayData = riskSpectrumSetup.map(categoryConfig => {
    const indicatorsDisplayData: KeyIndicatorDisplayInfo[] = categoryConfig.keyIndicatorsConfig
      .map(cfg => {
        const fetchedIndData = riskSpectrumFetchedData.find(d => d.indicator.id === cfg.id);
        const indicatorMeta = getIndicatorById(cfg.id);
        if (!indicatorMeta) return null;
        const categoryInfo = getCategoryBySlug(indicatorMeta.categoryKey);
        const link = categoryInfo ? `/category/${categoryInfo.slug}?indicator=${indicatorMeta.id}` : `/dashboard`; 
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
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${favoritesSnippetData.length >= 3 ? 'md:grid-cols-3' : `md:grid-cols-${favoritesSnippetData.length || 1}`} gap-4`}>
                {favoritesSnippetData.map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={`fav-${indicator.id}`} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Indicators</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {summaryData.length > 0 ? (
                  summaryData
                      .filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id))
                      .slice(0, 9) 
                      .map(({ indicator, latestValue, previousValue, sparklineData }) => (
                  <SummaryCard key={indicator.id} indicator={indicator} latestValue={latestValue} previousValue={previousValue} sparklineData={sparklineData}/> ))
              ) : ( <p className="col-span-full text-center text-muted-foreground py-8">No key indicators to display.</p> )}
              {summaryData.length > 0 && summaryData.filter(data => data.latestValue !== null || (country !== 'US' && !data.indicator.id.startsWith("US")) || ['BTC_PRICE_USD', 'CRYPTO_FEAR_GREED', 'SP500'].includes(data.indicator.id)).slice(0,9).length === 0 && (
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
                return ( <AssetRiskCategoryCard key={category.title} title={category.title} description={category.description} indicatorsDisplayData={category.indicatorsDisplayData} /> );
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
                      displayChangeValue = change7D; displayChangeLabel = "7D";
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
                  let indicatorLink = '/dashboard';
                    if (categoryInfo) indicatorLink = `/category/${categoryInfo.slug}?indicator=${indicator.id}`;
                    else if (indicator.id) {
                        const financialCategory = getCategoryBySlug('financial-conditions'); 
                        if (financialCategory) indicatorLink = `/category/${financialCategory.slug}?indicator=${indicator.id}`;
                    }

                  return (
                    <Link href={indicatorLink} key={`snap-${indicator.id}`} className="block p-2.5 rounded-md hover:bg-muted/50 transition-colors group border-b border-border/30 last:border-b-0">
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
          <NewsFeedWidget initialNews={newsApiArticles} /> 
          <AlphaNewsSentimentWidget initialArticles={alphaNewsArticles} itemCount={3} title="Market Sentiment News" dataTimestamp={dataFetchTimestamp} />
          <EconomicCalendarWidget initialEvents={economicEvents} daysAhead={30} itemCount={4} dataTimestamp={dataFetchTimestamp} />
          <FredReleasesWidget initialReleases={fredReleases} itemCount={5} dataTimestamp={dataFetchTimestamp} />
          <EarningsCalendarWidget initialEvents={earningsEvents} horizon="3month" itemCount={5} dataTimestamp={dataFetchTimestamp} />
          <InsiderTransactionsWidget initialTransactions={insiderTransactionsData} itemCount={5} dataTimestamp={dataFetchTimestamp} />
        </aside>
      </div>
    </div>
  );
}