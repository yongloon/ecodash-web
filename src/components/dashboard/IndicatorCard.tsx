// src/components/dashboard/IndicatorCard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch"; // Correct import
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { FaInfoCircle } from 'react-icons/fa';
import { FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import { Lock, Star, BarChartHorizontalBig } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useFavorites } from '@/hooks/useFavorites';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { calculateSeriesStatistics, SeriesStatistics, calculateMovingAverage } from '@/lib/calculations';
import ChartComponent, { MovingAverageSeries } from './ChartComponent';
import { format, parseISO, isValid } from 'date-fns';

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
}

const getMaPeriods = (frequency?: string): number[] => {
    if (frequency === 'Daily' || frequency === 'Weekly') return [20, 50, 100];
    if (frequency === 'Monthly') return [3, 6, 12];
    if (frequency === 'Quarterly') return [2, 4];
    return [30];
};

const FEATURE_ACCESS: Record<string, AppPlanTier[]> = {
    MOVING_AVERAGES: ['basic', 'pro'],
    ADVANCED_STATS_BUTTON: ['pro'],
    FAVORITES: ['basic', 'pro'],
};

const canUserAccessFeature = (userTier: AppPlanTier | undefined, featureKey: string): boolean => {
    const effectiveTier = userTier || 'free';
    return FEATURE_ACCESS[featureKey]?.includes(effectiveTier) || false;
};


export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier;
  const isLoggedIn = !!userSessionData && sessionStatus === 'authenticated';

  const canAccessMAs = canUserAccessFeature(userTier, 'MOVING_AVERAGES');
  const canAccessAdvancedStats = canUserAccessFeature(userTier, 'ADVANCED_STATS_BUTTON');
  const canUseFavorites = isLoggedIn && canUserAccessFeature(userTier, 'FAVORITES');

  const { addFavorite, removeFavorite, isFavorited, isLoadingFavorites } = useFavorites(); // Removed favoriteIds, not directly used
  const currentIsFavorited = useMemo(() => isFavorited(indicator.id), [isFavorited, indicator.id]);

  const displayValue = useMemo(() => latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}`
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
      };
    }).filter(ma => ma.data.length > 0);
  }, [validHistoricalData, selectedMaPeriods, canAccessMAs]);

  const promptUpgrade = (featureName: string) => {
    if (confirm(`${featureName} requires a higher tier subscription. Would you like to view plans?`)) {
        router.push('/pricing');
    }
  };

  const handleMaToggle = (period: number) => {
    if (!canAccessMAs) {
        promptUpgrade("Moving Averages");
        return;
    }
    setSelectedMaPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  const handleAdvancedStatsClick = () => {
    if (!canAccessAdvancedStats) {
        promptUpgrade("Advanced Statistics");
        return;
    }
    alert("Showing Advanced Statistics! (Pro Feature Placeholder) - Would navigate or show modal.");
  };

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
        if (confirm("Please login to save favorites. Go to login page?")) {
            router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname + window.location.search));
        }
        return;
    }
    if (!canUseFavorites) {
        promptUpgrade("Favoriting indicators");
        return;
    }
    if (isLoadingFavorites) return;

    if (currentIsFavorited) {
      await removeFavorite(indicator.id);
    } else {
      await addFavorite(indicator.id);
    }
  };

  const isDataEffectivelyUnavailable = historicalData.length === 0 && latestValue === null;

  return (
    <Card className="flex flex-col h-full border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow duration-200 relative overflow-hidden">
      <CardHeader className="pb-3">
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
          <div className="flex items-center space-x-1 flex-shrink-0">
            {isLoggedIn && FEATURE_ACCESS.FAVORITES && (
                <TooltipProvider delayDuration={100}> <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-amber-500 disabled:opacity-50"
                            onClick={handleFavoriteToggle} disabled={isLoadingFavorites || !canUseFavorites}
                            aria-label={currentIsFavorited ? "Remove from favorites" : "Add to favorites"}
                        > {currentIsFavorited ? <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> : <Star className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>{currentIsFavorited ? "Unfavorite" : "Favorite"}</p>
                        {!canUseFavorites && <p className="text-xs text-amber-600 mt-1">Upgrade to use favorites.</p>}
                    </TooltipContent>
                </Tooltip> </TooltipProvider>
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
           {validHistoricalData && validHistoricalData.length > 0 ? (
             <ChartComponent
                data={validHistoricalData}
                dataKey="value"
                type={indicator.chartType || 'line'}
                movingAverages={movingAverageData}
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

        {FEATURE_ACCESS.MOVING_AVERAGES && availableMaPeriods.length > 0 && validHistoricalData.length >= Math.min(...availableMaPeriods, Infinity) && (
          <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 pt-1.5 border-t w-full mt-1.5">
            <Label className="text-xs font-medium text-muted-foreground shrink-0 mr-1">MAs:</Label>
            {availableMaPeriods.map(period => (
              <div key={period} className="flex items-center space-x-1 relative group">
                <Switch
                  id={`ma-${indicator.id}-${period}`}
                  checked={selectedMaPeriods.includes(period) && canAccessMAs}
                  onCheckedChange={() => handleMaToggle(period)}
                  disabled={!canAccessMAs}
                  className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                  // thumbClassName prop removed here
                />
                <Label htmlFor={`ma-${indicator.id}-${period}`} className={`text-xs ${!canAccessMAs ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  {period}{indicator.frequency?.charAt(0).toUpperCase() || 'P'}
                </Label>
                {!canAccessMAs && (
                  <TooltipProvider delayDuration={50}> <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                            onClick={(e) => {e.preventDefault(); e.stopPropagation(); promptUpgrade("Moving Averages");}}
                            className="flex items-center justify-center h-full ml-0.5"
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
              </div>
            ))}
          </div>
        )}

        {FEATURE_ACCESS.ADVANCED_STATS_BUTTON && (
            <div className="w-full pt-1.5 border-t mt-1.5">
                <Button
                    variant="outline" size="xs" className="w-full text-xs h-7"
                    onClick={handleAdvancedStatsClick} disabled={!canAccessAdvancedStats}
                >
                    <BarChartHorizontalBig className="mr-1.5 h-3.5 w-3.5" />
                    Advanced Stats
                    {!canAccessAdvancedStats && <Lock className="ml-1.5 h-3 w-3 text-amber-500" />}
                </Button>
                {!canAccessAdvancedStats && (
                    <p className="text-xs text-muted-foreground text-center mt-0.5">
                        <Button asChild variant="link" size="xs" className="p-0 h-auto text-xs">
                            <Link href="/pricing">Upgrade to Pro</Link>
                        </Button> for Advanced Statistics.
                    </p>
                )}
            </div>
        )}
      </CardFooter>
    </Card>
  );
}