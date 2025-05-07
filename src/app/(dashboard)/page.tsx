// src/app/(dashboard)/page.tsx (Overview Page)
import React from 'react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData'; // Using mock data fetcher for now

// Define headline indicator IDs for the overview page
const headlineIndicatorIds = ['GDP_REAL', 'UNRATE', 'CPI', 'PMI', 'SP500', 'US10Y']; // Added Treasury Yield

// Server Component to fetch data for the overview page
export default async function OverviewPage({
    searchParams
}: {
    searchParams?: { [key: string]: string | string[] | undefined }; // Access search params
}) {
  const country = searchParams?.country || 'US'; // Get country from URL, default to US
  console.log(`Overview Page - Country: ${country}`);
  // TODO: Adapt data fetching based on the selected country if not 'US'

  // Fetch data for headline indicators
  const summaryDataPromises = headlineIndicatorIds
    .map(id => getIndicatorById(id)) // Get metadata
    .filter((indicator): indicator is IndicatorMetadata => !!indicator) // Filter out undefined indicators
    .map(async (indicator) => {
       // Only fetch if US or if the indicator is known to be global/mock
       if (country === 'US' || indicator.apiSource === 'Mock' /* Add other conditions */) {
            const historicalData = await fetchIndicatorData(indicator, 1); // Fetch last ~1 year for trend calculation
            const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
            // Get previous value (simple approach: second to last point, might need smarter logic based on frequency)
            const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
            return { indicator, latestValue, previousValue };
       } else {
           // Handle non-US case - maybe show N/A or fetch international data if implemented
            return { indicator, latestValue: null, previousValue: null };
       }
    });

  const summaryData = await Promise.all(summaryDataPromises);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
      <p className="text-muted-foreground">
        Key economic indicators for {country === 'US' ? 'United States' : country} at a glance.
        {country === 'US' && ' (Using Mock Data / FRED Placeholders)'}
        {country !== 'US' && ' (International data may be limited)'}
      </p>

      {/* Grid for Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {summaryData
            .filter(data => data.latestValue !== null || country !== 'US') // Only show cards with data or if non-US (to indicate lack of data)
            .map(({ indicator, latestValue, previousValue }) => (
          <SummaryCard
            key={indicator.id}
            indicator={indicator}
            latestValue={latestValue}
            previousValue={previousValue}
          />
        ))}
         {summaryData.length === 0 && country !== 'US' && (
             <p className="text-muted-foreground col-span-full">No data available for the selected country.</p>
         )}
      </div>

      {/* Placeholder for future sections */}
      {/* <div className="mt-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Market Movers</h2>
        <p className="text-muted-foreground">Section for market news or major changes...</p>
      </div> */}
    </div>
  );
}
