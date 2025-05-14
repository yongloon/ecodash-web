// src/components/dashboard/EarningsCalendarWidget.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { EarningsEvent, fetchEarningsCalendar } from '@/lib/api'; // Ensure fetchEarningsCalendar is correctly imported
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // <<< IMPORT CARD
import { Briefcase, Loader2, AlertTriangle } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns'; // Added differenceInDays

interface EarningsCalendarWidgetProps {
    initialEvents?: EarningsEvent[];
    daysAhead?: number;
    itemCount?: number;
}

export default function EarningsCalendarWidget({ 
    initialEvents, 
    daysAhead = 7,
    itemCount = 6, // Default to show a few more earnings
}: EarningsCalendarWidgetProps) {
  const [events, setEvents] = useState<EarningsEvent[]>(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!initialEvents) {
    setIsLoading(true);
    setError(null);
    console.log("[EarningsCalendarWidget] Fetching earnings..."); // Add log
    fetchEarningsCalendar(daysAhead)
      .then(data => {
        console.log(`[EarningsCalendarWidget] Fetched ${data.length} earnings events.`); // Add log
        setEvents(data.slice(0, itemCount)); // Slicing after fetch
      })
      .catch(err => { /* ... console.error ... */ })
      .finally(() => setIsLoading(false));
  }
}, [initialEvents, daysAhead, itemCount]);

  const formatReleaseTime = (hour: string): string => {
    if (hour === 'bmo') return 'Before Market Open';
    if (hour === 'amc') return 'After Market Close';
    if (hour === 'dmh') return 'During Market Hours';
    if (hour) return hour.toUpperCase(); // In case it's a specific time like "08:00:00"
    return 'N/A';
  };

  const getDateDisplay = (dateStr: string): string => {
    if (!dateStr || !isValid(parseISO(dateStr))) return "Date N/A";
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    // const daysDiff = differenceInDays(date, new Date()); // Check future days
    // if (daysDiff > 1 && daysDiff < 7) return format(date, "eeee"); // Day of week for next few days
    return format(date, "MMM d"); // Default format
  };
  // --- ENSURE NO STRAY CHARACTERS OR INCOMPLETE STATEMENTS HERE ---

  return ( // This is line 57/58 where the error points to <Card>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Briefcase className="h-5 w-5 mr-2 text-green-500" />
          Upcoming Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-sm text-destructive flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>{error}</p>}
        {!isLoading && !error && events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No major earnings releases found for the upcoming period.</p>
        )}
        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar"> {/* Added custom-scrollbar if you define it */}
            {events.map((event, index) => (
              <li key={`${event.symbol}-${event.date}-${index}`} className="border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors">
                        {/* You could make this a link to a stock page if you had one */}
                        {/* <Link href={`/stock/${event.symbol}`}>{event.symbol}</Link> */}
                        {event.symbol}
                    </span>
                    <span className="text-muted-foreground font-medium">{getDateDisplay(event.date)}</span>
                </div>
                 <p className="text-muted-foreground leading-tight text-xs">{formatReleaseTime(event.hour)}</p>
                {event.epsEstimate !== null && <p className="text-muted-foreground text-xs">EPS Est: {event.epsEstimate?.toFixed(2) ?? 'N/A'}</p>}
                {/* Add Revenue Estimate if desired */}
                {/* {event.revenueEstimate !== null && <p className="text-muted-foreground text-xs">Rev Est: ${(event.revenueEstimate / 1000).toFixed(1)}B</p>} */}
              </li>
            ))}
          </ul>
        )}
         {!isLoading && !error && (
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