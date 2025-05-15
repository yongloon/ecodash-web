// src/components/dashboard/EconomicCalendarWidget.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { EconomicEvent, fetchEconomicCalendar } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Loader2, AlertTriangle, Info } from 'lucide-react'; // Added Info
import { format, parseISO, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EconomicCalendarWidgetProps {
    initialEvents?: EconomicEvent[];
    daysAhead?: number;
    itemCount?: number;
}

export default function EconomicCalendarWidget({
    initialEvents,
    daysAhead = 30,
    itemCount = 5,
}: EconomicCalendarWidgetProps) {
  const [events, setEvents] = useState<EconomicEvent[]>(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEvents) {
      // console.log(`[EconomicCalendarWidget] useEffect: Fetching events for ${daysAhead} days.`);
      setIsLoading(true);
      setError(null);
      fetchEconomicCalendar(daysAhead)
        .then(data => {
          // console.log(`[EconomicCalendarWidget] fetchEconomicCalendar returned ${data.length} total events. Data:`, JSON.stringify(data, null, 2).substring(0,300));
          const filteredEvents = data
              .filter(event => event.country === 'US' && (event.impact === 'high' || event.impact === 'medium'))
              .slice(0, itemCount);
          // console.log(`[EconomicCalendarWidget] ${filteredEvents.length} events after filtering.`);
          setEvents(filteredEvents);
        })
        .catch(err => {
          console.error("[EconomicCalendarWidget] Error fetching events:", err);
          setError(err.message || "Could not load economic events.");
        })
        .finally(() => {
          // console.log("[EconomicCalendarWidget] Fetch finished.");
          setIsLoading(false);
        });
    } else {
        // console.log("[EconomicCalendarWidget] Using initialEvents. Count:", initialEvents.length);
        const filteredInitial = initialEvents
            .filter(event => event.country === 'US' && (event.impact === 'high' || event.impact === 'medium'))
            .slice(0,itemCount);
        setEvents(filteredInitial);
        setIsLoading(false);
    }
  }, [initialEvents, daysAhead, itemCount]);

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
        {!isLoading && !error && events.length === 0 && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>No major US events (high/medium impact) found for the upcoming period. This could be due to API limitations on the free tier or a quiet period.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-sm text-muted-foreground">Loading events...</p>
          </div>
        )}
        {!isLoading && error && (
            <div className="text-sm text-destructive p-3 bg-destructive/10 rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                <span>{error}</span>
            </div>
        )}
        {!isLoading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No major US economic events (high/medium impact) currently listed for the next {daysAhead} days.
          </p>
        )}
        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {events.map((event, index) => (
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
        {!isLoading && (
             <div className="mt-4 text-center">
                <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                    Economic data powered by Finnhub.io
                </a>
            </div>
        )}
      </CardContent>
    </Card>
  );
}