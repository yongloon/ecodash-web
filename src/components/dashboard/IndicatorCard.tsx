// src/components/dashboard/IndicatorCard.tsx
import React from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ChartComponent from './ChartComponent';
import { format, parseISO } from 'date-fns';
import { FaInfoCircle } from 'react-icons/fa';

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
}

// Component to display a single indicator with its chart and details
export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {

  // Format the latest value and date for display
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}` // Format number with commas and limit decimals
    : 'N/A';
  const displayDate = latestValue?.date
    ? `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})` // Use parseISO for robust date parsing
    : '';

  return (
    <Card className="flex flex-col h-full border border-border shadow-sm hover:shadow-md transition-shadow duration-200"> {/* Added hover effect */}
      <CardHeader>
        <div className="flex justify-between items-start gap-2"> {/* Added gap */}
          {/* Title and Value */}
          <div className='flex-1 min-w-0'> {/* Allow text to wrap */}
            <CardTitle className="text-base md:text-lg truncate" title={indicator.name}> {/* Add truncate and title attribute */}
                {indicator.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span> {/* Make value stand out */}
              <span className="text-xs ml-1">{displayDate}</span>
            </CardDescription>
          </div>
          {/* Tooltip Icon */}
          {indicator.description && ( // Only show tooltip if description exists
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground flex-shrink-0"> {/* Use theme colors */}
                    <FaInfoCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border"> {/* Use theme colors */}
                  <p>{indicator.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        {/* Chart Area */}
        <div className="flex-grow h-48 md:h-64 -ml-2 -mr-2"> {/* Adjust margins slightly if needed for chart */}
           <ChartComponent
              data={historicalData}
              dataKey="value"
              type={indicator.chartType || 'line'} // Default to line chart
            />
        </div>
      </CardContent>
      <CardFooter className="justify-between"> {/* Space between source and frequency */}
        {/* Data Source Citation */}
        <div className='truncate' title={`Source: ${indicator.sourceName}`}> {/* Add truncate and title */}
            Source: {indicator.sourceLink ? (
            <a href={indicator.sourceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                {indicator.sourceName}
            </a>
            ) : (
            <span className="ml-1">{indicator.sourceName}</span>
            )}
        </div>
        {/* Frequency */}
        {indicator.frequency && <span className="flex-shrink-0 ml-2">({indicator.frequency})</span>}
      </CardFooter>
    </Card>
  );
}
