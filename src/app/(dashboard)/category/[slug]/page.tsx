// src/app/(dashboard)/category/[slug]/page.tsx (Dynamic Category Page)
import React from 'react';
import { getIndicatorsByCategorySlug, getCategoryBySlug, TimeSeriesDataPoint, IndicatorMetadata } from '@/lib/indicators';
import IndicatorCard from '@/components/dashboard/IndicatorCard';
import { fetchIndicatorData } from '@/lib/mockData'; // Using mock data fetcher for now
import { notFound } from 'next/navigation'; // Import notFound

interface CategoryPageParams {
  slug: string; // The category slug from the URL
}

// Server Component to fetch and display indicators for a specific category
export default async function CategoryPage({
    params,
    searchParams
}: {
    params: CategoryPageParams;
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { slug } = params;
  const country = searchParams?.country || 'US'; // Get country from URL, default to US
  console.log(`Category Page (${slug}) - Country: ${country}`);
  // TODO: Adapt data fetching based on the selected country if not 'US'


  // Get category details and indicators for this slug
  const category = getCategoryBySlug(slug);
  const categoryIndicators = getIndicatorsByCategorySlug(slug);

  // If category or indicators are not found, show 404
  if (!category || categoryIndicators.length === 0) {
    notFound(); // Trigger the 404 page
  }

  // Fetch data for all indicators in this category
  const indicatorDataPromises = categoryIndicators.map(async (indicator) => {
    // Only fetch if US or if the indicator is known to be global/mock
    if (country === 'US' || indicator.apiSource === 'Mock' /* Add other conditions */) {
        const historicalData = await fetchIndicatorData(indicator, 5); // Fetch last 5 years
        const latestValue = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;
        return { indicator, latestValue, historicalData };
    } else {
        // Handle non-US case
        return { indicator, latestValue: null, historicalData: [] };
    }
  });

  const resolvedIndicatorData = await Promise.all(indicatorDataPromises);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
      <p className="text-muted-foreground">
        Detailed view for {country === 'US' ? 'United States' : country}.
        {country === 'US' && ' (Using Mock Data / FRED Placeholders)'}
        {country !== 'US' && ' (International data may be limited)'}
      </p>

      {/* Grid for Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {resolvedIndicatorData
            .filter(data => data.historicalData.length > 0 || country !== 'US') // Show card even if no data for non-US
            .map(({ indicator, latestValue, historicalData }) => (
          <IndicatorCard
            key={indicator.id}
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

// Optional: Generate static paths for categories if known beforehand and not using country filter extensively
// export async function generateStaticParams(): Promise<CategoryPageParams[]> {
//   return Object.values(indicatorCategories).map(category => ({
//     slug: category.slug,
//   }));
// }
