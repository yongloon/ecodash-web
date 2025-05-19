// src/app/(dashboard)/category/[slug]/page.tsx
import React from 'react';
import { getIndicatorsByCategorySlug, getCategoryBySlug, IndicatorMetadata } from '@/lib/indicators';
import IndicatorCard from '@/components/dashboard/IndicatorCard';
import { fetchIndicatorData } from '@/lib/mockData';
import { notFound } from 'next/navigation';
import IndicatorScroll from './IndicatorScroll'; // <<< ADD THIS IMPORT (adjust path if needed)

interface CategoryPageParams {
  slug: string;
}

export default async function CategoryPage({
    params,
    searchParams
}: {
    params: CategoryPageParams;
    searchParams?: {
        country?: string;
        startDate?: string;
        endDate?: string;
        indicator?: string; // For scrolling
    };
}) {
  const { slug } = params;
  const country = searchParams?.country || 'US';
  const dateRange = {
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
  };
  // console.log(`Category Page (${slug}) - Country: ${country}, Range: ${dateRange.startDate} to ${dateRange.endDate}`);

  const category = getCategoryBySlug(slug);
  const categoryIndicators = getIndicatorsByCategorySlug(slug);

  if (!category || categoryIndicators.length === 0) {
    notFound();
  }

  const indicatorDataPromises = categoryIndicators.map(async (indicator) => {
    if (country === 'US' || indicator.apiSource === 'Mock' /* Or other global sources */) {
        const historicalData = await fetchIndicatorData(indicator, dateRange);
        const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
        return { indicator, latestValue, historicalData };
    } else {
        return { indicator, latestValue: null, historicalData: [] };
    }
  });

  const resolvedIndicatorData = await Promise.all(indicatorDataPromises);

  return (
    <div className="space-y-6">
      <IndicatorScroll /> {/* <<< ADD THIS COMPONENT HERE */}
      <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {resolvedIndicatorData
            .filter(data => data.historicalData.length > 0 || country !== 'US')
            .map(({ indicator, latestValue, historicalData }) => (
          <IndicatorCard
            key={indicator.id}
            // id={`indicator-${indicator.id}`} // Add id prop to IndicatorCard itself later if needed by IndicatorScroll
            indicator={indicator}
            latestValue={latestValue}
            historicalData={historicalData}
          />
        ))}
        {resolvedIndicatorData.every(d => d.historicalData.length === 0) && country !== 'US' && (
             <p className="text-muted-foreground col-span-full">No data available for this category in the selected country.</p>
         )}
      </div>
    </div>
  );
}