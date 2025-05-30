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
import { Loader2, AlertTriangle, XCircle, ArrowLeft, BarChart3 } from "lucide-react"; // Added ArrowLeft, BarChart3
import toast from 'react-hot-toast';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/pro/comparison");
    }
  }, [status, router]);

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (selectedIndicatorIds.length > 0) {
      current.set('indicators', selectedIndicatorIds.join(','));
    } else {
      current.delete('indicators');
    }
    // Only push if the search string actually changes to avoid redundant pushes
    if (current.toString() !== searchParams.toString()) {
        router.replace(`${pathname}?${current.toString()}`, { scroll: false });
    }
  }, [selectedIndicatorIds, pathname, router, searchParams]);


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

          let rawData: TimeSeriesDataPoint[] = [];
          let fetchErr: string | null = null;
          try {
            rawData = await fetchIndicatorData(indicatorMeta, dateRange);
          } catch (err: any) {
            console.error(`[ComparisonPage] Error fetching data for ${id}:`, err.message);
            fetchErr = err.message || `Failed to load data for ${indicatorMeta.name}.`;
            // Continue, so other successful fetches can still be processed
          }
          
          let displayData = rawData;
          if (normalizeData && rawData.length > 0) {
            const firstValidPoint = rawData.find(dp => dp.value !== null && dp.value !== 0);
            const firstValue = firstValidPoint?.value;
            if (firstValue !== null && firstValue !== undefined && firstValue !== 0) {
              displayData = rawData.map(dp => ({
                ...dp,
                value: dp.value !== null ? (dp.value / firstValue) * 100 : null,
              }));
            } else if (firstValue === 0) { 
                displayData = rawData.map(dp => ({ ...dp, value: dp.value === 0 ? 100 : (dp.value !== null ? (dp.value / 0.000001) * 100 : null) }));
            }
          }
          
          return {
            data: displayData,
            dataKey: `series_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`, // Sanitize dataKey
            name: indicatorMeta.name,
            color: DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length],
            type: indicatorMeta.chartType || 'line',
            yAxisId: index % 2 === 0 ? 'left' : 'right', 
            unit: normalizeData ? ' (Rebased)' : indicatorMeta.unit,
            fetchError: fetchErr, // Store individual fetch error
          };
        });

        const results = (await Promise.all(fetchedSeriesPromises)).filter(s => s !== null) as (ChartSeries & { fetchError?: string | null })[];
        
        const successfulSeries = results.filter(s => !s.fetchError && s.data.length > 0);
        const erroredSeries = results.filter(s => s.fetchError);

        if (erroredSeries.length > 0) {
            const errorMessages = erroredSeries.map(s => `${s.name}: ${s.fetchError}`).join('\n');
            toast.error(`Could not load data for:\n${errorMessages.substring(0, 200)}${errorMessages.length > 200 ? '...' : ''}`, { duration: 6000 });
        }
        
        if (successfulSeries.length === 0 && selectedIndicatorIds.length > 0) {
            setChartError(erroredSeries.length > 0 ? "Failed to load data for all selected indicators." : "No data available for the selected indicators or date range.");
            setSeriesData([]);
        } else {
            setSeriesData(successfulSeries);
        }

      } catch (error: any) { // Catch for Promise.all or other general errors
        console.error("Error fetching data for comparison (general):", error);
        setChartError(error.message || "An unexpected error occurred while loading comparison data.");
        toast.error(error.message || "Error loading comparison data.");
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
        return prev;
      }
      return newSelected;
    });
  };


  if (status === "loading") {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col items-center justify-center">
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
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-4">Pro Feature: Indicator Comparison</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          This tool requires a Pro subscription. Upgrade to compare multiple indicators side-by-side.
        </p>
        <div className="flex gap-2">
          <Link href="/pricing"><Button size="lg">Upgrade to Pro</Button></Link>
          <Link href="/dashboard"><Button size="lg" variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
            <Link href="/dashboard">
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Dashboard</span>
                </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Indicator Comparison Tool
            </h1>
        </div>
        <div className="flex items-center space-x-4 self-start sm:self-center">
             <DateRangePicker />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Indicators</CardTitle>
            <CardDescription className="text-xs">Choose up to {MAX_COMPARISON_INDICATORS}.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-200px)] overflow-y-auto space-y-1.5 pr-2">
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

        <Card className="lg:col-span-9 min-h-[450px] sm:min-h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Comparison Chart</CardTitle>
             {selectedIndicatorIds.length > 0 && seriesData.length > 0 && (
                 <CardDescription className="text-xs">
                    Comparing: {seriesData.map(s => s.name).join(' vs. ')}
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
                <AlertTriangle className="mx-auto h-10 w-10 mb-3" />
                <p className="font-semibold text-base">Error Loading Chart</p>
                <p className="text-xs max-w-md mb-3">{chartError}</p>
                 <Button variant="outline" size="sm" onClick={() => setSelectedIndicatorIds([])}>Clear Selections & Retry</Button>
              </div>
            )}
            {!isLoadingData && !chartError && seriesData.length > 0 && seriesData.some(s=> s.data.length > 0) && (
              <div className="w-full h-[calc(100%-2rem)] min-h-[350px] sm:min-h-[450px]"> {/* Ensure chart has space */}
                <ChartComponent
                  series={seriesData}
                  showRecessionPeriods={true}
                  enableBrush={true}
                  chartId="comparison-chart"
                />
              </div>
            )}
            {!isLoadingData && selectedIndicatorIds.length === 0 && (
              <div className="text-center text-muted-foreground py-10 h-full flex flex-col justify-center items-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                <p className="font-medium">Indicator Comparison</p>
                <p className="text-sm">Select up to {MAX_COMPARISON_INDICATORS} indicators from the left panel to compare them.</p>
              </div>
            )}
             {!isLoadingData && !chartError && selectedIndicatorIds.length > 0 && seriesData.length === 0 && (
                <div className="text-center text-muted-foreground py-10 h-full flex flex-col justify-center items-center">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-amber-500" />
                    <p className="font-medium">No Data to Display</p>
                    <p className="text-sm max-w-md">
                        No data could be loaded for the currently selected indicators and date range. Please try different indicators or adjust the date range.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}