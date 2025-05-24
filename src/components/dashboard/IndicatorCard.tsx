// src/components/dashboard/IndicatorCard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Corrected: use 'next/navigation' for App Router
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { FaInfoCircle } from 'react-icons/fa';
import { FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import { Lock, Star, BarChartHorizontalBig, Download, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useFavorites } from '@/hooks/useFavorites';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { calculateSeriesStatistics, SeriesStatistics, calculateMovingAverage } from '@/lib/calculations';
import ChartComponent, { MovingAverageSeries, ChartSeries } from './ChartComponent'; // ChartSeries added for type consistency
import { format, parseISO, isValid } from 'date-fns';
import { canUserAccessFeature, FEATURE_KEYS, FeatureKey } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
  fetchError?: string | null; // New prop for error message
}

const getMaPeriods = (frequency?: string): number[] => {
    if (frequency === 'Daily' || frequency === 'Weekly') return [20, 50, 100];
    if (frequency === 'Monthly') return [3, 6, 12];
    if (frequency === 'Quarterly') return [2, 4];
    return [30]; // Default for unspecified or other frequencies
};

const downloadCSV = (data: TimeSeriesDataPoint[], filename: string) => {
  if (!data || data.length === 0) {
    toast.error("No data available to download.");
    return;
  }
  const header = "date,value\n";
  const csvContent = data
    .map(row => `${row.date},${row.value === null || row.value === undefined ? '' : row.value}`)
    .join("\n");
  
  const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}_data.csv`);
  }
};


export default function IndicatorCard({ indicator, latestValue, historicalData, fetchError }: IndicatorCardProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier;
  const isLoggedIn = !!userSessionData && sessionStatus === 'authenticated';

  const canAccessMAs = canUserAccessFeature(userTier, FEATURE_KEYS.MOVING_AVERAGES);
  const canAccessAdvancedStats = canUserAccessFeature(userTier, FEATURE_KEYS.ADVANCED_STATS_BUTTON);
  const canUseFavorites = isLoggedIn && canUserAccessFeature(userTier, FEATURE_KEYS.FAVORITES);
  const canExportData = isLoggedIn && canUserAccessFeature(userTier, FEATURE_KEYS.DATA_EXPORT);

  const { addFavorite, removeFavorite, isFavorited, isLoadingFavorites } = useFavorites();
  const currentIsFavorited = useMemo(() => isFavorited(indicator.id), [isFavorited, indicator.id]);

  const displayValue = useMemo(() => latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: indicator.unit === '%' || indicator.unit?.includes('Index') ? 1 : 2 })} ${indicator.unit}`
    : 'N/A', [latestValue, indicator.unit]);

  const displayDate = useMemo(() => {
    if (latestValue?.date && isValid(parseISO(latestValue.date))) {
      try { return `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})`; } catch (e) { return ''; }
    }
    return '';
  }, [latestValue?.date]);

  const validHistoricalData = useMemo(() => Array.isArray(historicalData) ? historicalData.filter(d => d.value !== null && d.value !== undefined && d.date && isValid(parseISO(d.date))) : [], [historicalData]);

  const statistics: SeriesStatistics = useMemo(() =>
    calculateSeriesStatistics(validHistoricalData),
  [validHistoricalData]);

  const availableMaPeriods = useMemo(() =>
    getMaPeriods(indicator.frequency),
  [indicator.frequency]);

  const [selectedMaPeriods, setSelectedMaPeriods] = useState<number[]>([]);

  const movingAverageData: MovingAverageSeries[] = useMemo(() => {
    if (!canAccessMAs || selectedMaPeriods.length === 0) return [];
    return selectedMaPeriods.map((period, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
      return {
        period,
        data: calculateMovingAverage(validHistoricalData, period),
        color: colors[index % colors.length],
        dataKey: 'value',
        name: `MA ${period}`,
        type: 'line',
        yAxisId: 'left' // Assume all MAs use the left axis for simplicity here
      };
    }).filter(ma => ma.data.length > 0);
  }, [validHistoricalData, selectedMaPeriods, canAccessMAs]);

  const promptUpgrade = (featureName: string, requiredTierText: string = "a higher tier") => {
    toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-card shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-border ring-opacity-5 p-4`}
        >
          <div className="flex-1 w-0">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <Lock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Upgrade Required
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {featureName} requires {requiredTierText}.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col border-l border-border/50 ml-4 pl-4 space-y-2">
             <Button size="sm" onClick={() => { router.push('/pricing'); toast.dismiss(t.id); }}>View Plans</Button>
             <Button size="sm" variant="outline" onClick={() => toast.dismiss(t.id)}>Dismiss</Button>
          </div>
        </div>
      ), { duration: 6000 }
    );
  };

  const promptLoginForFeature = (featureName: string): void => {
    toast((t) => (
        <span>
          Please login to use {featureName.toLowerCase()}.
          <Button variant="link" size="sm" className="ml-2 p-0 h-auto" onClick={() => {router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname + window.location.search)); toast.dismiss(t.id);}}>Login</Button>
        </span>
    ));
  };

  const handleMaToggle = (period: number) => {
    if (!isLoggedIn) {
        promptLoginForFeature("Moving Averages"); return;
    }
    if (!canAccessMAs) {
        promptUpgrade("Moving Averages", "Basic or Pro");
        return;
    }
    setSelectedMaPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  const handleAdvancedStatsClick = () => {
    if (!isLoggedIn) {
        promptLoginForFeature("Advanced Statistics"); return;
    }
    if (!canAccessAdvancedStats) {
        promptUpgrade("Advanced Statistics", "Pro");
        return;
    }
    toast.success("Pro Feature: Advanced Statistics (Placeholder)");
  };

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
        promptLoginForFeature("Favorites"); return;
    }
    if (!canUseFavorites) {
        promptUpgrade("Favoriting indicators", "Basic or Pro");
        return;
    }
    if (isLoadingFavorites) return;

    if (currentIsFavorited) {
      await removeFavorite(indicator.id);
    } else {
      await addFavorite(indicator.id);
    }
  };
  
  const handleDataExport = () => {
    if (!isLoggedIn) {
        promptLoginForFeature("Data Export"); return;
    }
    if (!canExportData) {
      promptUpgrade("Data Export", "Pro");
      return;
    }
    downloadCSV(validHistoricalData, indicator.name);
  };

  const isDataEffectivelyUnavailable = !fetchError && validHistoricalData.length === 0 && latestValue === null;

  const chartSeries: ChartSeries[] = useMemo(() => {
    const baseSeries: ChartSeries = {
        data: validHistoricalData,
        dataKey: 'value',
        name: indicator.name,
        color: '#4f46e5', // Default color for the main series
        type: indicator.chartType || 'line',
        yAxisId: 'left',
        unit: indicator.unit,
    };
    return [baseSeries, ...movingAverageData];
  }, [validHistoricalData, indicator, movingAverageData]);


  return (
    <Card id={`indicator-${indicator.id}`} className="flex flex-col h-full border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
      <CardHeader className="pb-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex justify-between items-start gap-2">
          <div className='flex-1 min-w-0'>
            <CardTitle className="text-base md:text-lg font-semibold leading-tight tracking-tight truncate" title={indicator.name}>
                {indicator.name}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span>
              <span className="text-xs ml-1 text-muted-foreground">{displayDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
            <TooltipProvider delayDuration={100}> <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-amber-500 disabled:opacity-50 relative"
                        onClick={handleFavoriteToggle} 
                        disabled={isLoadingFavorites || (isLoggedIn && !canUseFavorites)}
                        aria-label={currentIsFavorited ? "Remove from favorites" : "Add to favorites"}
                    > 
                      {isLoadingFavorites ? <Loader2 className="h-4 w-4 animate-spin" /> : (currentIsFavorited ? <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> : <Star className="h-4 w-4" />)}
                      {isLoggedIn && !canUseFavorites && !isLoadingFavorites && <Lock className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-amber-600 bg-card rounded-full p-0.5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                    <p>{currentIsFavorited ? "Unfavorite" : "Favorite"}</p>
                    {isLoggedIn && !canUseFavorites && <p className="text-xs text-amber-600 mt-1">Upgrade to use favorites.</p>}
                    {!isLoggedIn && <p className="text-xs text-muted-foreground mt-1">Login to use favorites.</p>}
                </TooltipContent>
            </Tooltip> </TooltipProvider>
            
            {validHistoricalData.length > 0 && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-50 relative"
                      onClick={handleDataExport}
                      disabled={isLoggedIn && !canExportData}
                      aria-label="Export Data as CSV"
                    >
                      <Download className="h-4 w-4" />
                      {isLoggedIn && !canExportData && <Lock className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 text-amber-600 bg-card rounded-full p-0.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Export Data (CSV)</p>
                    {isLoggedIn && !canExportData && <p className="text-xs text-amber-600 mt-1">Upgrade to Pro to export.</p>}
                    {!isLoggedIn && <p className="text-xs text-muted-foreground mt-1">Login to export data.</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {statistics && statistics.count > 0 && (
                 <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                        <FiBarChart2 className="h-4 w-4" />
                    </Button>
                 </TooltipTrigger> <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                    <p className="font-semibold mb-1">Data Statistics ({statistics.count} points):</p>
                    <ul className="list-none space-y-0.5">
                        <li>Mean: <span className="font-medium">{statistics.mean?.toLocaleString() ?? 'N/A'}</span></li>
                        <li>Median: <span className="font-medium">{statistics.median?.toLocaleString() ?? 'N/A'}</span></li>
                        <li>Min: <span className="font-medium">{statistics.min?.toLocaleString() ?? 'N/A'}</span></li>
                        <li>Max: <span className="font-medium">{statistics.max?.toLocaleString() ?? 'N/A'}</span></li>
                        <li>Std Dev: <span className="font-medium">{statistics.stdDev?.toLocaleString() ?? 'N/A'}</span></li>
                    </ul>
                 </TooltipContent> </Tooltip> </TooltipProvider>
            )}
            {indicator.description && (
              <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <FaInfoCircle className="h-4 w-4" />
                 </Button>
              </TooltipTrigger> <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                <p>{indicator.description}</p>
              </TooltipContent> </Tooltip> </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col px-3 sm:px-4 pt-0 pb-2">
        <div className="flex-grow h-48 md:h-56 lg:h-60 -ml-1 -mr-1 sm:-ml-2 sm:-mr-2">
           {fetchError ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive text-xs p-3 text-center">
              <FiAlertCircle className="h-6 w-6 mb-2 opacity-70" />
              <p className="font-semibold">Data Error</p>
              <p>{fetchError.length > 100 ? fetchError.substring(0, 97) + "..." : fetchError}</p>
            </div>
           ) : validHistoricalData && validHistoricalData.length > 0 ? (
             <ChartComponent
                series={chartSeries}
                chartId={`indicator-chart-${indicator.id}`}
              />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs p-3 text-center">
               <FiAlertCircle className="h-6 w-6 mb-2 opacity-70" />
               <p>
                {isDataEffectivelyUnavailable
                    ? "Data currently unavailable for this indicator."
                    : "No data points for the selected period."}
               </p>
             </div>
           )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 text-xs px-3 sm:px-4 pt-2 pb-3 border-t">
        <div className="w-full flex justify-between items-center text-muted-foreground">
            <div className='truncate max-w-[50%] sm:max-w-[60%]' title={`Source: ${indicator.sourceName}`}>
                Source: {indicator.sourceLink ? (
                    <a href={indicator.sourceLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        {indicator.sourceName}
                    </a>
                ) : ( <span className="ml-1">{indicator.sourceName}</span> )}
            </div>
            {indicator.frequency && <span className="flex-shrink-0 ml-2">({indicator.frequency})</span>}
        </div>

        {availableMaPeriods.length > 0 && validHistoricalData.length >= Math.min(...availableMaPeriods, Infinity) && (
          <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 pt-1.5 border-t w-full mt-1.5">
            <Label className="text-xs font-medium text-muted-foreground shrink-0 mr-1">MAs:</Label>
            {availableMaPeriods.map(period => (
              <div key={period} className="flex items-center space-x-1 relative group">
                <Switch
                  id={`ma-${indicator.id}-${period}`}
                  checked={selectedMaPeriods.includes(period) && canAccessMAs}
                  onCheckedChange={() => handleMaToggle(period)}
                  disabled={isLoggedIn && !canAccessMAs}
                  className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                />
                <Label htmlFor={`ma-${indicator.id}-${period}`} className={`text-xs ${(!isLoggedIn || !canAccessMAs) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  {period}{indicator.frequency?.charAt(0).toUpperCase() || 'P'}
                </Label>
                {isLoggedIn && !canAccessMAs && (
                  <TooltipProvider delayDuration={50}> <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                            onClick={(e) => {e.preventDefault(); e.stopPropagation(); promptUpgrade("Moving Averages", "Basic or Pro");}}
                            className="flex items-center justify-center h-full ml-0.5 cursor-pointer"
                            aria-label="Upgrade for Moving Averages"
                        > <Lock className="h-3 w-3 text-amber-500 group-hover:text-amber-400 transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>Moving Averages require Basic/Pro.</p>
                        <Button asChild size="xs" variant="link" className="p-0 h-auto text-xs">
                            <Link href="/pricing">Upgrade Now</Link>
                        </Button>
                      </TooltipContent>
                  </Tooltip> </TooltipProvider>
                )}
                 {!isLoggedIn && (
                    <TooltipProvider delayDuration={50}> <Tooltip>
                        <TooltipTrigger asChild>
                             <button onClick={(e) => {e.preventDefault(); e.stopPropagation(); promptLoginForFeature("Moving Averages");}} className="flex items-center justify-center h-full ml-0.5 cursor-pointer" aria-label="Login for Moving Averages" >
                                <Lock className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p className="text-xs">Login to use Moving Averages.</p></TooltipContent>
                    </Tooltip> </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        )}
        {(
            <div className="w-full pt-1.5 border-t mt-1.5">
                <Button
                    variant="outline" size="xs" className="w-full text-xs h-7"
                    onClick={handleAdvancedStatsClick} 
                    disabled={isLoggedIn && !canAccessAdvancedStats}
                >
                    <BarChartHorizontalBig className="mr-1.5 h-3.5 w-3.5" />
                    Advanced Stats
                    {isLoggedIn && !canAccessAdvancedStats && <Lock className="ml-1.5 h-3 w-3 text-amber-500" />}
                </Button>
                {isLoggedIn && !canAccessAdvancedStats && (
                    <p className="text-xs text-muted-foreground text-center mt-0.5">
                        <Button asChild variant="link" size="xs" className="p-0 h-auto text-xs">
                            <Link href="/pricing">Upgrade to Pro</Link>
                        </Button> for Advanced Statistics.
                    </p>
                )}
                {!isLoggedIn && (
                     <p className="text-xs text-muted-foreground text-center mt-0.5">
                        <Button asChild variant="link" size="xs" className="p-0 h-auto text-xs">
                            <Link href={`/login?callbackUrl=${encodeURIComponent((typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/dashboard'))}`}>Login</Link>
                        </Button> or <Button asChild variant="link" size="xs" className="p-0 h-auto text-xs"><Link href="/pricing">Upgrade</Link></Button> for this feature.
                    </p>
                )}
            </div>
        )}
      </CardFooter>
    </Card>
  );
}