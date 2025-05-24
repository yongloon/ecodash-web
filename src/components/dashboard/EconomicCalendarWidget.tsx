// File: src/components/dashboard/EconomicCalendarWidget.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { EconomicEvent } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Info } from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNowStrict } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EconomicCalendarWidgetProps {
    initialEvents?: EconomicEvent[];
    daysAhead?: number;
    itemCount?: number;
    dataTimestamp?: string;
}

export default function EconomicCalendarWidget({
    initialEvents = [],
    daysAhead = 30,
    itemCount = 5,
    dataTimestamp
}: EconomicCalendarWidgetProps) {
  const eventsToDisplay = initialEvents
    .filter(event => event.country === 'US' && (event.impact === 'high' || event.impact === 'medium'))
    .slice(0, itemCount);

  const [isClientMounted, setIsClientMounted] = useState(false); // <<< ADDED STATE

  useEffect(() => { // <<< ADDED EFFECT
      setIsClientMounted(true);
  }, []);

  const getImpactColor = (impact: string | null | undefined) => {
    if (impact === 'high') return 'text-red-500 dark:text-red-400';
    if (impact === 'medium') return 'text-amber-500 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarDays className="h-5 w-5 mr-2 text-blue-500" />
          Upcoming Economic Events
        </CardTitle>
        {eventsToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>No major US events (high/medium impact) found for the upcoming period. This could be due to API limitations or a quiet period.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {eventsToDisplay.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No major US economic events (high/medium impact) currently listed for the next {daysAhead} days.
          </p>
        )}
        {eventsToDisplay.length > 0 && (
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {eventsToDisplay.map((event, index) => (
              <li key={event.calendarId || index} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start text-xs mb-0.5">
                    <span className={`font-semibold ${getImpactColor(event.impact)}`}>
                        {event.impact?.toUpperCase()} Impact
                    </span>
                    <span className="text-muted-foreground">
                        {event.time && isValid(parseISO(event.time)) ? format(parseISO(event.time), "MMM d, HH:mm") : 'Time N/A'} UTC
                    </span>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">{event.event}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                    <span>Country: {event.country}</span>
                    {event.actual !== null && <span>Actual: {event.actual}{event.unit}</span>}
                    {event.actual === null && event.estimate !== null && <span>Forecast: {event.estimate}{event.unit}</span>}
                    {event.prev !== null && <span>Prev: {event.prev}{event.unit}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
            <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                Calendar data as of {/* <<< MODIFIED LINE */}
                {isClientMounted ? formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true }) : "a moment ago"}
            </p>
        )}
         <div className="mt-1 text-center">
            <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Economic data powered by Finnhub.io
            </a>
        </div>
      </CardContent>
    </Card>
  );
}