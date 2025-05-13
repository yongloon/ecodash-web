// src/components/dashboard/IndicatorCard.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ChartComponent, { MovingAverageSeries } from './ChartComponent'; // Ensure MovingAverageSeries is exported or defined
import { format, parseISO, isValid } from 'date-fns';
import { FaInfoCircle } from 'react-icons/fa';
import { calculateSeriesStatistics, SeriesStatistics, calculateMovingAverage } from '@/lib/calculations';
import { FiBarChart2 } from 'react-icons/fi';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from 'next-auth/react';
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp, BarChartHorizontalBig } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Make sure this path is correct

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
}

const getMaPeriods = (frequency?: string): number[] => {
    if (frequency === 'Daily' || frequency === 'Weekly') return [20, 50];
    if (frequency === 'Monthly') return [3, 6];
    if (frequency === 'Quarterly') return [2, 4];
    return [30]; // Default
};

const FEATURE_ACCESS: Record<string, AppPlanTier[]> = {
    MOVING_AVERAGES: ['basic', 'pro'],
    ADVANCED_STATS_BUTTON: ['pro'],
};

const canUserAccessFeature = (userTier: AppPlanTier | undefined, featureKey: string): boolean => {
    const effectiveTier = userTier || 'free';
    return FEATURE_ACCESS[featureKey]?.includes(effectiveTier) || false;
};

export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {
  const { data: session } = useSession();
  const userSessionData = session?.user as any;
  const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier;

  const canAccessMAs = canUserAccessFeature(userTier, 'MOVING_AVERAGES');
  const canAccessAdvancedStats = canUserAccessFeature(userTier, 'ADVANCED_STATS_BUTTON');

  // --- RESTORED/CORRECTED DEFINITIONS ---
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}`
    : 'N/A';

  let displayDate = '';
  if (latestValue?.date && isValid(parseISO(latestValue.date))) {
    try {
      displayDate = `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})`;
    } catch (e) { /* date parsing failed, displayDate remains empty */ }
  }

  const validHistoricalData = Array.isArray(historicalData) ? historicalData : [];
  const statistics: SeriesStatistics = useMemo(() => 
    calculateSeriesStatistics(validHistoricalData), 
  [validHistoricalData]);

  const availableMaPeriods = useMemo(() => 
    getMaPeriods(indicator.frequency), 
  [indicator.frequency]);
  // --- END OF RESTORED/CORRECTED DEFINITIONS ---


  const [selectedMaPeriods, setSelectedMaPeriods] = useState<number[]>([]);

  const movingAverageData: MovingAverageSeries[] = useMemo(() => {
    if (!canAccessMAs) return [];
    return selectedMaPeriods.map((period, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
      return {
        period,
        data: calculateMovingAverage(validHistoricalData, period),
        color: colors[index % colors.length],
      };
    }).filter(ma => ma.data.length > 0);
  }, [validHistoricalData, selectedMaPeriods, canAccessMAs]);

  const handleMaToggle = (period: number) => {
    if (!canAccessMAs) {
        alert("Moving Averages require a Basic or Pro subscription. Please upgrade.");
        // Consider using a more user-friendly modal or redirect here
        // For example: router.push('/pricing'); (if router is available)
        return;
    }
    setSelectedMaPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  const handleAdvancedStatsClick = () => {
    if (!canAccessAdvancedStats) {
        alert("Advanced Statistics is a Pro feature. Please upgrade.");
        return;
    }
    alert("Showing Advanced Statistics! (Pro Feature)"); // Placeholder for actual feature
  };

  // --- JSX Return statement starts here ---
  return (
    <Card className="flex flex-col h-full border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className='flex-1 min-w-0'>
            <CardTitle className="text-base md:text-lg font-semibold leading-tight tracking-tight truncate" title={indicator.name}>
                {indicator.name}
                {/* Example: Show PRO badge next to indicator name if it's a Pro-only indicator based on its metadata */}
                {/* {indicator.minTier === 'pro' && !canAccessProIndicator && <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-600">PRO</Badge>} */}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span>
              <span className="text-xs ml-1 text-muted-foreground">{displayDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {statistics && statistics.count > 0 && ( // Statistics Tooltip
                 <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                            <FiBarChart2 className="h-4 w-4" />
                        </button>
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
            {indicator.description && ( // Info Tooltip
              <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <FaInfoCircle className="h-4 w-4" />
                    </button>
              </TooltipTrigger> <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                <p>{indicator.description}</p>
              </TooltipContent> </Tooltip> </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow h-48 md:h-64 -ml-1 -mr-1 sm:-ml-2 sm:-mr-2">
           <ChartComponent
              data={validHistoricalData}
              dataKey="value"
              type={indicator.chartType || 'line'}
              movingAverages={movingAverageData}
            />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 text-xs pt-2">
        <div className="w-full flex justify-between items-center text-muted-foreground">
            <div className='truncate max-w-[60%]' title={`Source: ${indicator.sourceName}`}>
                Source: {indicator.sourceLink ? (
                    <a href={indicator.sourceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                        {indicator.sourceName}
                    </a>
                ) : ( <span className="ml-1">{indicator.sourceName}</span> )}
            </div>
            {indicator.frequency && <span className="flex-shrink-0 ml-2">({indicator.frequency})</span>}
        </div>
        
        {availableMaPeriods.length > 0 && validHistoricalData.length > Math.max(...availableMaPeriods, 0) && (
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-1 border-t w-full mt-2">
            <Label className="text-xs font-medium text-muted-foreground shrink-0">MAs:</Label>
            {availableMaPeriods.map(period => (
              <div key={period} className="flex items-center space-x-1.5 relative">
                <Switch
                  id={`ma-${indicator.id}-${period}`}
                  checked={selectedMaPeriods.includes(period) && canAccessMAs}
                  onCheckedChange={() => handleMaToggle(period)}
                  disabled={!canAccessMAs && FEATURE_ACCESS.MOVING_AVERAGES.length > 0} // Disable if MA is a gated feature and user lacks access
                  className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                  thumbClassName="h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5"
                />
                <Label htmlFor={`ma-${indicator.id}-${period}`} className={`text-xs ${(!canAccessMAs && FEATURE_ACCESS.MOVING_AVERAGES.length > 0) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  {period}{indicator.frequency?.charAt(0).toUpperCase()}
                </Label>
                {(!canAccessMAs && FEATURE_ACCESS.MOVING_AVERAGES.length > 0) && ( // Show lock only if MAs are meant to be gated
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger 
                        asChild /* Important for positioning if parent is flex/grid item */
                        // className="absolute -top-1 -right-1.5 z-10" // This positioning might need adjustment
                      > 
                        <span className="ml-1 cursor-pointer" onClick={(e) => {e.preventDefault(); router.push('/pricing');}}> {/* Assuming router is available */}
                            <Lock className="h-3 w-3 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Moving Averages require Basic or Pro.</p>
                        <Link href="/pricing" legacyBehavior><Button size="xs" variant="link" className="p-0 h-auto text-xs">Upgrade</Button></Link>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="w-full pt-2 border-t mt-2">
            <Button 
                variant="outline" 
                size="xs" 
                className="w-full text-xs"
                onClick={handleAdvancedStatsClick}
                disabled={!canAccessAdvancedStats}
            >
                <BarChartHorizontalBig className="mr-2 h-3.5 w-3.5" />
                Advanced Stats
                {!canAccessAdvancedStats && FEATURE_ACCESS.ADVANCED_STATS_BUTTON.length > 0 && <Lock className="ml-2 h-3 w-3 text-amber-500" />}
            </Button>
            {(!canAccessAdvancedStats && FEATURE_ACCESS.ADVANCED_STATS_BUTTON.length > 0) && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                    <Link href="/pricing" className="text-primary hover:underline">Upgrade to Pro</Link> for Advanced Statistics.
                </p>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}