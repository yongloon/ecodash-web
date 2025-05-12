// src/components/dashboard/IndicatorCard.tsx
"use client"; 

import React, { useState, useMemo } from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ChartComponent, { MovingAverageSeries } from './ChartComponent';
import { format, parseISO, isValid } from 'date-fns';
import { FaInfoCircle } from 'react-icons/fa';
import { calculateSeriesStatistics, SeriesStatistics, calculateMovingAverage } from '@/lib/calculations';
import { FiBarChart2 } from 'react-icons/fi';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[]; // This prop should always be an array
}

const getMaPeriods = (frequency?: string): number[] => {
    if (frequency === 'Daily' || frequency === 'Weekly') return [20, 50];
    if (frequency === 'Monthly') return [3, 6];
    if (frequency === 'Quarterly') return [2, 4];
    return [30];
};

export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}`
    : 'N/A';

  let displayDate = '';
  if (latestValue?.date && isValid(parseISO(latestValue.date))) {
    try {
      displayDate = `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})`;
    } catch (e) { /* date parsing failed */ }
  }

  // Ensure historicalData is an array, even if it's passed as undefined or null unexpectedly
  const validHistoricalData = Array.isArray(historicalData) ? historicalData : [];
  const statistics: SeriesStatistics = useMemo(() => calculateSeriesStatistics(validHistoricalData), [validHistoricalData]);

  const availableMaPeriods = useMemo(() => getMaPeriods(indicator.frequency), [indicator.frequency]);
  const [selectedMaPeriods, setSelectedMaPeriods] = useState<number[]>([]);

  const movingAverageData: MovingAverageSeries[] = useMemo(() => {
    return selectedMaPeriods.map((period, index) => {
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
      return {
        period,
        data: calculateMovingAverage(validHistoricalData, period), // Use validHistoricalData
        color: colors[index % colors.length],
      };
    }).filter(ma => ma.data.length > 0);
  }, [validHistoricalData, selectedMaPeriods]);

  const handleMaToggle = (period: number) => {
    setSelectedMaPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  return (
    <Card className="flex flex-col h-full border border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className='flex-1 min-w-0'>
            <CardTitle className="text-base md:text-lg font-semibold leading-tight tracking-tight truncate" title={indicator.name}>
                {indicator.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span>
              <span className="text-xs ml-1 text-muted-foreground">{displayDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Statistics Tooltip - MODIFIED WITH A CHECK FOR statistics OBJECT */}
            {statistics && statistics.count > 0 && (
                 <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                            <FiBarChart2 className="h-4 w-4" />
                        </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                            <p className="font-semibold mb-1">Data Statistics ({statistics.count} points):</p>
                            <ul className="list-none space-y-0.5">
                                <li>Mean: <span className="font-medium">{statistics.mean?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Median: <span className="font-medium">{statistics.median?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Min: <span className="font-medium">{statistics.min?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Max: <span className="font-medium">{statistics.max?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Std Dev: <span className="font-medium">{statistics.stdDev?.toLocaleString() ?? 'N/A'}</span></li>
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {/* Info Tooltip */}
            {indicator.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <FaInfoCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                    <p>{indicator.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow h-48 md:h-64 -ml-1 -mr-1 sm:-ml-2 sm:-mr-2">
           <ChartComponent
              data={validHistoricalData} // Use validHistoricalData
              dataKey="value"
              type={indicator.chartType || 'line'}
              movingAverages={movingAverageData}
            />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 text-xs text-muted-foreground pt-2">
        <div className="w-full flex justify-between items-center">
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
          <div className="flex items-center space-x-2 pt-1 border-t border-border w-full mt-2">
            <Label className="text-xs font-medium text-muted-foreground">MAs:</Label>
            {availableMaPeriods.map(period => (
              <div key={period} className="flex items-center space-x-1.5">
                <Switch
                  id={`ma-${indicator.id}-${period}`}
                  checked={selectedMaPeriods.includes(period)}
                  onCheckedChange={() => handleMaToggle(period)}
                  className="h-4 w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                  // @ts-ignore because Shadcn Switch might not have thumbClassName directly exposed in all versions or type defs
                  thumbClassName="h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5" 
                />
                <Label htmlFor={`ma-${indicator.id}-${period}`} className="text-xs cursor-pointer">
                  {period}
                  {indicator.frequency === 'Daily' || indicator.frequency === 'Weekly' ? 'D' : 
                   indicator.frequency === 'Monthly' ? 'M' : 
                   indicator.frequency === 'Quarterly' ? 'Q' : ''}
                </Label>
              </div>
            ))}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}