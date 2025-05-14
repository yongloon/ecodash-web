// src/components/dashboard/EconomicCalendarWidget.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { EconomicEvent, fetchEconomicCalendar } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Loader2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EconomicCalendarWidgetProps {
    initialEvents?: EconomicEvent[];
    daysAhead?: number;
    itemCount?: number; // Max items to display
}

export default function EconomicCalendarWidget({ 
    initialEvents, 
    daysAhead = 7,
    itemCount = 5,
}: EconomicCalendarWidgetProps) {
  const [events, setEvents] = useState<EconomicEvent[]>(initialEvents || []);
  const [isLoading, setIsLoading] = useState(!initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!initialEvents) {
    setIsLoading(true);
    setError(null);
    console.log("[EconomicCalendarWidget] Fetching events..."); // Add log
    fetchEconomicCalendar(daysAhead)
      .then(data => {
        // Filter for high/medium impact AND THEN slice
        const filteredEvents = data
            .filter(event => event.country === 'US' && (event.impact === 'high' || event.impact === 'medium')) // Example: Filter for US and high/medium impact
            .slice(0, itemCount);
        console.log(`[EconomicCalendarWidget] Fetched ${data.length} total events, ${filteredEvents.length} after filtering for widget.`); // Add log
        setEvents(filteredEvents);
      })
      .catch(err => { /* ... console.error ... */ })
      .finally(() => setIsLoading(false));
  }
}, [initialEvents, daysAhead, itemCount]);

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'text-red-500 dark:text-red-400';
    if (impact === 'medium') return 'text-amber-500 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarDays className="h-5 w-5 mr-2 text-blue-500" />
          Upcoming Economic Events
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
          <p className="text-sm text-muted-foreground">No major economic events found for the upcoming period.</p>
        )}
        {!isLoading && !error && events.length > 0 && (
          <ul className="space-y-3">
            {events.map((event, index) => (
              <li key={event.calendarId || index} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start text-xs mb-0.5">
                    <span className={`font-semibold ${getImpactColor(event.impact)}`}>
                        {event.impact?.toUpperCase()} Impact
                    </span>
                    <span className="text-muted-foreground">
                        {format(parseISO(event.time), "MMM d, HH:mm")} UTC
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
        {!isLoading && !error && (
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