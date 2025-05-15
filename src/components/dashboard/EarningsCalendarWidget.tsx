// src/components/dashboard/EarningsCalendarWidget.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { EarningsEvent, fetchEarningsCalendar } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Loader2, AlertTriangle, Info } from 'lucide-react'; // Added Info
import { format, parseISO, isToday, isTomorrow, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EarningsCalendarWidgetProps {
    initialEvents?: EarningsEvent[];
    daysAhead?: number;
    itemCount?: number;
}

export default function EarningsCalendarWidget({
    initialEvents,
    daysAhead = 30,
    itemCount = 6,
}: EarningsCalendarWidgetProps) {
  const [events, setEvents] = useState<EarningsEvent[]>(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEvents) {
      // console.log(`[EarningsCalendarWidget] useEffect: Fetching earnings for ${daysAhead} days.`);
      setIsLoading(true);
      setError(null);
      fetchEarningsCalendar(daysAhead)
        .then(data => {
          // console.log(`[EarningsCalendarWidget] fetchEarningsCalendar returned ${data.length} events. Data:`, JSON.stringify(data, null, 2).substring(0,300));
          setEvents(data.slice(0, itemCount));
        })
        .catch(err => {
          console.error("[EarningsCalendarWidget] Error fetching earnings:", err);
          setError(err.message || "Could not load earnings events.");
        })
        .finally(() => {
          // console.log("[EarningsCalendarWidget] Fetch finished.");
          setIsLoading(false);
        });
    } else {
        // console.log("[EarningsCalendarWidget] Using initialEvents. Count:", initialEvents.length);
        setEvents(initialEvents.slice(0, itemCount));
        setIsLoading(false);
    }
  }, [initialEvents, daysAhead, itemCount]);

  const formatReleaseTime = (hour: string | null | undefined): string => {
    if (hour === 'bmo') return 'Before Market Open';
    if (hour === 'amc') return 'After Market Close';
    if (hour === 'dmh') return 'During Market Hours';
    if (hour) return hour.toUpperCase();
    return 'Time N/A';
  };

  const getDateDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr || !isValid(parseISO(dateStr))) return "Date N/A";
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d");
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-green-500" />
          Upcoming Earnings
        </CardTitle>
        {!isLoading && !error && events.length === 0 && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>No earnings releases found for the upcoming period. This could be due to API limitations or a quiet period.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-sm text-muted-foreground">Loading earnings...</p>
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
            No earnings releases currently listed for the next {daysAhead} days.
            </p>
        )}
        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {events.map((event, index) => (
              <li key={`${event.symbol}-${event.date}-${index}`} className="border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                        {event.symbol}
                    </span>
                    <span className="text-muted-foreground font-medium">{getDateDisplay(event.date)}</span>
                </div>
                 <p className="text-muted-foreground leading-tight text-xs">{formatReleaseTime(event.hour)}</p>
                {event.epsEstimate !== null && <p className="text-muted-foreground text-xs">EPS Est: {event.epsEstimate?.toFixed(2) ?? 'N/A'}</p>}
              </li>
            ))}
          </ul>
        )}
        {!isLoading && (
             <div className="mt-4 text-center">
                <a href="https://finnhub.io" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                    Earnings data powered by Finnhub.io
                </a>
            </div>
        )}
      </CardContent>
    </Card>
  );
}