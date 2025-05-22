// src/app/(dashboard)/page.tsx
import React from 'react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators'; // Keep IndicatorMetadata
import { fetchIndicatorData } from '@/lib/mockData';
import { TrendingUp } from 'lucide-react'; // Keep if using for "Key Indicators" title
// Removed imports for: Link, getServerSession, authOptions, AppPlanTier, other widgets, most icons, FaArrows, date-fns (unless used in SummaryCard internally)

export const revalidate = 3600; // Revalidate MVP dashboard less frequently if needed, e.g., every hour

// For MVP, select a few truly key indicators for the overview
const mvpHeadlineIndicatorIds = [
    'GDP_GROWTH', // Assuming this is preferred over GDP_NOMINAL for a quick view
    'UNRATE',
    'CPI_YOY_PCT',
    'FEDFUNDS',
    'SP500',
];

// Simplified data fetching for MVP overview
async function fetchMvpSummaryData(
    ids: string[],
    country: string, // Keep country if CountrySelector is kept, otherwise hardcode to 'US'
    dateRange?: { startDate?: string; endDate?: string } // For sparkline consistency
): Promise<Array<{
    indicator: IndicatorMetadata; // Keep IndicatorMetadata
    latestValue: TimeSeriesDataPoint | null;
    previousValue: TimeSeriesDataPoint | null;
    sparklineData: TimeSeriesDataPoint[];
}>> {
  if (!ids || ids.length === 0) return [];

  return Promise.all(
      ids.map(async (id) => {
          const indicator = getIndicatorById(id);
          if (!indicator) {
              console.warn(`[MVP Dashboard] Indicator not found: ${id}`);
              // Provide a valid structure even if indicator is null for type safety, though filter it out later
              return { indicator: null as any, latestValue: null, previousValue: null, sparklineData: [] };
          }

          // For MVP, country might be hardcoded or from a simplified selector
          const shouldFetch = country === 'US' || indicator.apiSource === 'Mock' || ['SP500'].includes(indicator.id); // Simplified logic
          let latestValue: TimeSeriesDataPoint | null = null;
          let previousValue: TimeSeriesDataPoint | null = null;
          let sparklineDataToUse: TimeSeriesDataPoint[] = [];

          if (shouldFetch) {
              const fetchedData = await fetchIndicatorData(indicator, dateRange); // Use consistent dateRange
              latestValue = fetchedData.length > 0 ? fetchedData[fetchedData.length - 1] : null;
              previousValue = fetchedData.length > 1 ? fetchedData[fetchedData.length - 2] : null;
              // Sparkline: last N points, e.g., 30 for daily/weekly, 12 for monthly
              const sparklineLength = (indicator.frequency === 'Daily' || indicator.frequency === 'Weekly') ? 30 : 12;
              sparklineDataToUse = fetchedData.slice(-sparklineLength);
          }
          return { indicator, latestValue, previousValue, sparklineData: sparklineDataToUse };
      })
  ).then(results => results.filter(r => r.indicator !== null) as Array<{
    indicator: IndicatorMetadata;
    latestValue: TimeSeriesDataPoint | null;
    previousValue: TimeSeriesDataPoint | null;
    sparklineData: TimeSeriesDataPoint[];
  }>); // Filter out null indicators
}


export default async function OverviewPageMVP({ searchParams }: { searchParams?: { country?: string; startDate?: string; endDate?: string; }; }) {
  // const session = await getServerSession(authOptions); // Not needed if no tier-specific UI on MVP overview
  const country = searchParams?.country || 'US'; // Keep if CountrySelector is used, else hardcode 'US'
  // For SummaryCards, a consistent (short) date range for sparklines might be best.
  // Or, fetch a longer range and let SummaryCard slice it. Let's assume fetchIndicatorData gets a decent range.
  const dateRangeForSparklines = { startDate: searchParams?.startDate, endDate: searchParams?.endDate };


  const summaryData = await fetchMvpSummaryData(mvpHeadlineIndicatorIds, country, dateRangeForSparklines);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
        {/* No upgrade banners or complex user-specific messages for MVP */}
      </div>

      {/* Simplified Key Indicators Section */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-3 mt-6 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-indigo-500"/> Key Economic Indicators
        </h2>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${summaryData.length >= 3 ? 'md:grid-cols-3' : `md:grid-cols-${summaryData.length || 1}`} ${summaryData.length >= 5 ? 'lg:grid-cols-5' : `lg:grid-cols-${summaryData.length || 1}`} gap-4 md:gap-6`}>
          {summaryData.length > 0 ? (
              summaryData.map(({ indicator, latestValue, previousValue, sparklineData }) => (
                <SummaryCard
                    key={indicator.id}
                    indicator={indicator}
                    latestValue={latestValue}
                    previousValue={previousValue}
                    sparklineData={sparklineData}
                />
              ))
          ) : (
             <p className="col-span-full text-center text-muted-foreground py-8">
                Key indicator data is currently unavailable.
             </p>
          )}
        </div>
      </section>

      {/* All other sections (Favorites snippet, Asset Risk Insights, all widgets) are removed for MVP */}

       <p className="text-muted-foreground mt-10 text-center">
            Explore more indicators by selecting a category from the sidebar.
      </p>
    </div>
  );
}