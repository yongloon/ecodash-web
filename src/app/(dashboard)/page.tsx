// src/app/(dashboard)/page.tsx (Overview Page)
import React from 'react';
import SummaryCard from '@/components/dashboard/SummaryCard';
import { getIndicatorById, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';

const headlineIndicatorIds = ['GDP_REAL', 'UNRATE', 'CPI_YOY_PCT', 'PMI', 'SP500', 'US10Y']; // Ensure CPI_YOY_PCT matches ID in indicators.ts

export default async function OverviewPage({
    searchParams
}: {
    searchParams?: {
        country?: string;
        startDate?: string;
        endDate?: string;
     };
}) {
  const country = searchParams?.country || 'US';
  const dateRange = {
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
  };
  console.log(`Overview Page - Country: ${country}, Range: ${dateRange.startDate} to ${dateRange.endDate}`);

  const summaryDataPromises = headlineIndicatorIds
    .map(id => getIndicatorById(id))
    .filter((indicator): indicator is IndicatorMetadata => !!indicator)
    .map(async (indicator) => {
       // Adapt data fetching based on the selected country
       if (country === 'US' || indicator.apiSource === 'Mock' /* Or other global sources */) {
            const historicalData = await fetchIndicatorData(indicator, dateRange); // Pass dateRange
            const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
            const previousValue = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;
            return { indicator, latestValue, previousValue, historicalData }; // Pass historicalData for SummaryCard if needed for chart
       } else {
            // Handle non-US case - maybe show N/A or fetch international data if implemented
            return { indicator, latestValue: null, previousValue: null, historicalData: [] };
       }
    });

  const summaryData = await Promise.all(summaryDataPromises);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
      <p className="text-muted-foreground">
        Key economic indicators for {country === 'US' ? 'United States' : country} at a glance.
        {country !== 'US' && ' (International data may be limited or use mock data placeholders)'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {summaryData
            .filter(data => data.latestValue !== null || country !== 'US')
            .map(({ indicator, latestValue, previousValue }) => ( // Removed historicalData if not used directly by SummaryCard
          <SummaryCard
            key={indicator.id}
            indicator={indicator}
            latestValue={latestValue}
            previousValue={previousValue}
          />
        ))}
         {summaryData.every(d => d.latestValue === null) && country !== 'US' && (
             <p className="text-muted-foreground col-span-full">No data available for the selected country in this overview.</p>
         )}
      </div>
    </div>
  );
}