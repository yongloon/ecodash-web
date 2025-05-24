// src/app/pro/comparison/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';
import { AppPlanTier } from "@/app/api/auth/[...nextauth]/route";
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
import ChartComponent, { ChartSeries } from '@/components/dashboard/ChartComponent';
import { indicators as allIndicators, IndicatorMetadata, TimeSeriesDataPoint, getCategoryBySlug } from '@/lib/indicators';
import { fetchIndicatorData } from '@/lib/mockData';
import { Loader2, AlertTriangle, XCircle } from "lucide-react";
import toast from 'react-hot-toast';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'; // For global date range

const MAX_COMPARISON_INDICATORS = 4;
const DEFAULT_SERIES_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00C49F", "#FFBB28"];

export default function IndicatorComparisonPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  const canAccessComparison = useMemo(() => canUserAccessFeature(userTier, FEATURE_KEYS.INDICATOR_COMPARISON), [userTier]);

  const initialIdsFromUrl = useMemo(() => {
    const ids = searchParams.get('indicators');
    return ids ? ids.split(',').slice(0, MAX_COMPARISON_INDICATORS) : [];
  }, [searchParams]);

  const [selectedIndicatorIds, setSelectedIndicatorIds] = useState<string[]>(initialIdsFromUrl);
  const [seriesData, setSeriesData] = useState<ChartSeries[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [normalizeData, setNormalizeData] = useState(false);

  // Update URL when selectedIndicatorIds change
  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (selectedIndicatorIds.length > 0) {
      current.set('indicators', selectedIndicatorIds.join(','));
    } else {
      current.delete('indicators');
    }
    router.replace(`${pathname}?${current.toString()}`, { scroll: false });
  }, [selectedIndicatorIds, pathname, router, searchParams]);


  // Effect to fetch data when selectedIndicatorIds change or date range changes or normalization changes
  useEffect(() => {
    if (selectedIndicatorIds.length === 0) {
      setSeriesData([]);
      setChartError(null);
      return;
    }

    const fetchDataForComparison = async () => {
      setIsLoadingData(true);
      setChartError(null);
      const dateRange = {
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
      };

      try {
        const fetchedSeriesPromises = selectedIndicatorIds.map(async (id, index) => {
          const indicatorMeta = allIndicators.find(ind => ind.id === id);
          if (!indicatorMeta) return null;

          const rawData = await fetchIndicatorData(indicatorMeta, dateRange);
          
          let displayData = rawData;
          if (normalizeData && rawData.length > 0) {
            const firstValidPoint = rawData.find(dp => dp.value !== null && dp.value !== 0);
            const firstValue = firstValidPoint?.value;
            if (firstValue !== null && firstValue !== undefined && firstValue !== 0) {
              displayData = rawData.map(dp => ({
                ...dp,
                value: dp.value !== null ? (dp.value / firstValue) * 100 : null,
              }));
            } else if (firstValue === 0) { // Handle case where first value is 0
                displayData = rawData.map(dp => ({ ...dp, value: dp.value === 0 ? 100 : (dp.value !== null ? (dp.value / 0.000001) * 100 : null) })); // Avoid division by zero, treat 0 as 100
            }
          }
          
          return {
            data: displayData,
            dataKey: 'value',
            name: indicatorMeta.name,
            color: DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length],
            type: indicatorMeta.chartType || 'line',
            yAxisId: index % 2 === 0 ? 'left' : 'right',
            unit: normalizeData ? ' (Rebased)' : indicatorMeta.unit,
          };
        });

        const results = (await Promise.all(fetchedSeriesPromises)).filter(s => s !== null) as ChartSeries[];
        
        let hasData = false;
        results.forEach(s => {
            if(s.data.some(dp => dp.value !== null)) {
                hasData = true;
            }
        });

        if (!hasData && results.length > 0) {
            toast.error("No data available for any selected indicators for the current period.", { duration: 4000 });
            setSeriesData([]); // Clear data if all selected are empty
        } else if (results.some(s => s.data.length === 0) && results.length > 0) {
             toast.error("Some selected indicators have no data for the current period.", { duration: 4000 });
             setSeriesData(results.filter(s => s.data.length > 0)); // Only show series with data
        }
         else {
            setSeriesData(results);
        }

      } catch (error: any) {
        console.error("Error fetching data for comparison:", error);
        const displayError = error.message?.includes("Failed to fetch data for") ? error.message : "Failed to load data for one or more indicators.";
        setChartError(displayError);
        toast.error(displayError);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDataForComparison();
  }, [selectedIndicatorIds, normalizeData, searchParams]);

  const handleIndicatorSelection = (indicatorId: string, checked: boolean) => {
    setSelectedIndicatorIds(prev => {
      const newSelected = checked
        ? [...prev, indicatorId]
        : prev.filter(id => id !== indicatorId);
      
      if (newSelected.length > MAX_COMPARISON_INDICATORS) {
        toast.error(`You can select up to ${MAX_COMPARISON_INDICATORS} indicators.`);
        return prev; // Return original if limit exceeded
      }
      return newSelected;
    });
  };


  if (status === "loading") {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }
  if (status === "unauthenticated") {
    return <div className="container mx-auto p-8 text-center"><p>Redirecting to login...</p></div>;
  }

  if (!canAccessComparison) {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-4">Pro Feature: Indicator Comparison</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          This tool requires a Pro subscription. Upgrade to compare multiple indicators side-by-side.
        </p>
        <Link href="/pricing"><Button size="lg">Upgrade to Pro</Button></Link>
        <Link href="/dashboard" className="mt-4"><Button variant="outline">Back to Dashboard</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Indicator Comparison Tool
        </h1>
        <div className="flex items-center space-x-4">
             <DateRangePicker /> {/* Global Date Range Picker */}
            <div className="flex items-center space-x-2">
                <Switch
                    id="normalize-data"
                    checked={normalizeData}
                    onCheckedChange={setNormalizeData}
                    disabled={isLoadingData || selectedIndicatorIds.length === 0}
                />
                <Label htmlFor="normalize-data" className="text-sm whitespace-nowrap">Rebase to 100</Label>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Indicators</CardTitle>
            <CardDescription className="text-xs">Choose up to {MAX_COMPARISON_INDICATORS}.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto space-y-1.5 pr-2">
            {allIndicators.map(indicator => (
              <div key={indicator.id} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-muted/50 has-[button:disabled]:opacity-60 has-[button:disabled]:cursor-not-allowed">
                <Checkbox
                  id={`compare-${indicator.id}`}
                  checked={selectedIndicatorIds.includes(indicator.id)}
                  onCheckedChange={(checked) => handleIndicatorSelection(indicator.id, !!checked)}
                  disabled={!selectedIndicatorIds.includes(indicator.id) && selectedIndicatorIds.length >= MAX_COMPARISON_INDICATORS}
                />
                <Label htmlFor={`compare-${indicator.id}`} className="text-sm font-normal cursor-pointer flex-1 truncate" title={indicator.name}>
                  {indicator.name}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 min-h-[450px] sm:min-h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Comparison Chart</CardTitle>
             {selectedIndicatorIds.length > 0 && (
                 <CardDescription className="text-xs">
                    Comparing: {selectedIndicatorIds.map(id => allIndicators.find(i=>i.id===id)?.name || id).join(' vs. ')}
                </CardDescription>
             )}
          </CardHeader>
          <CardContent className="flex-grow relative pt-2">
            {isLoadingData && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm z-10 rounded-b-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {chartError && !isLoadingData && (
              <div className="text-center text-destructive py-10 h-full flex flex-col justify-center items-center">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                <p className="font-semibold">Error Loading Chart</p>
                <p className="text-xs max-w-md">{chartError}</p>
                 <Button variant="outline" size="sm" onClick={() => setSelectedIndicatorIds([])} className="mt-3">Clear Selections & Retry</Button>
              </div>
            )}
            {!isLoadingData && !chartError && seriesData.length > 0 && seriesData.some(s=> s.data.length > 0) && (
              <div className="w-full h-[380px] sm:h-[480px]">
                <ChartComponent
                  series={seriesData}
                  showRecessionPeriods={true}
                  enableBrush={true}
                  chartId="comparison-chart"
                />
              </div>
            )}
            {!isLoadingData && !chartError && (selectedIndicatorIds.length === 0 || (seriesData.length > 0 && !seriesData.some(s => s.data.length > 0))) && (
                <div className="text-center text-muted-foreground py-10 h-full flex flex-col justify-center items-center">
                    <p>{selectedIndicatorIds.length === 0 ? `Select up to ${MAX_COMPARISON_INDICATORS} indicators to compare.` : "No data to display for the selected indicators or date range."}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}