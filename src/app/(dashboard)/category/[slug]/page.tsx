// src/app/(dashboard)/category/[slug]/page.tsx
import React from 'react';
import { getIndicatorsByCategorySlug, getCategoryBySlug, IndicatorMetadata } from '@/lib/indicators';
import IndicatorCard from '@/components/dashboard/IndicatorCard';
import { fetchIndicatorData } from '@/lib/mockData';
import { notFound } from 'next/navigation';
import IndicatorScroll from './IndicatorScroll'; 

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
        indicator?: string; 
    };
}) {
  const { slug } = params;
  const country = searchParams?.country || 'US';
  const dateRange = {
    startDate: searchParams?.startDate,
    endDate: searchParams?.endDate,
  };

  const category = getCategoryBySlug(slug);
  const categoryIndicators = getIndicatorsByCategorySlug(slug);

  if (!category || categoryIndicators.length === 0) {
    notFound();
  }

  const indicatorDataPromises = categoryIndicators.map(async (indicator) => {
    try {
      if (country === 'US' || indicator.apiSource === 'Mock' /* Or other global sources */) {
        const historicalData = await fetchIndicatorData(indicator, dateRange);
        const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
        return { indicator, latestValue, historicalData, error: null };
      } else {
        return { indicator, latestValue: null, historicalData: [], error: null };
      }
    } catch (error: any) {
      console.error(`Error fetching data for ${indicator.id} on category page:`, error.message);
      return { indicator, latestValue: null, historicalData: [], error: error.message || "Failed to load indicator data." };
    }
  });


  const resolvedIndicatorData = await Promise.all(indicatorDataPromises);

  return (
    <div className="space-y-6">
      <IndicatorScroll /> 
      <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {resolvedIndicatorData
            .filter(data => data.error || data.historicalData.length > 0 || country !== 'US') 
            .map(({ indicator, latestValue, historicalData, error }) => (
          <IndicatorCard
            key={indicator.id}
            indicator={indicator}
            latestValue={latestValue}
            historicalData={historicalData}
            fetchError={error} 
          />
        ))}
        {resolvedIndicatorData.every(d => !d.error && d.historicalData.length === 0) && country !== 'US' && (
             <p className="text-muted-foreground col-span-full">No data available for this category in the selected country.</p>
         )}
      </div>
    </div>
  );
}