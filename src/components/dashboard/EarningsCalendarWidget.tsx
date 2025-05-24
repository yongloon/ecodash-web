// File: src/components/dashboard/EarningsCalendarWidget.tsx
"use client";

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { EarningsEventAV } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Info } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isValid, startOfToday, formatDistanceToNowStrict } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EarningsCalendarWidgetProps {
    initialEvents?: EarningsEventAV[];
    horizon?: '3month' | '6month' | '12month';
    itemCount?: number;
    dataTimestamp?: string;
}

export default function EarningsCalendarWidget({
    initialEvents = [],
    horizon = '3month',
    itemCount = 5,
    dataTimestamp
}: EarningsCalendarWidgetProps) {
  
  const today = startOfToday();
  const [isClientMounted, setIsClientMounted] = useState(false); // <<< ADDED STATE

  useEffect(() => { // <<< ADDED EFFECT
      setIsClientMounted(true);
  }, []);

  const upcomingEvents = initialEvents
    .filter(event => {
        if (!event.reportDate || !isValid(parseISO(event.reportDate))) return false;
        return parseISO(event.reportDate) >= today;
    })
    .sort((a,b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  
  const eventsToDisplay = upcomingEvents.slice(0, itemCount);

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
        {eventsToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                        <p>No earnings releases found for the upcoming period based on the current filter.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {eventsToDisplay.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming earnings releases for the {horizon.replace('month', '-month')} horizon.
          </p>
        )}
        {eventsToDisplay.length > 0 && (
          <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {eventsToDisplay.map((event, index) => (
              <li key={`${event.symbol}-${event.reportDate}-${index}`} className="border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                <div className="flex justify-between items-center mb-0.5">
                    <TooltipProvider delayDuration={150}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate cursor-default max-w-[60%]" title={event.name}>
                                    {event.name || event.symbol}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {event.symbol} - {event.name}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="text-muted-foreground font-medium">{getDateDisplay(event.reportDate)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Symbol: {event.symbol}</span>
                    {event.estimate !== null && event.estimate !== undefined ? (
                        <p className="text-muted-foreground">EPS Est: {event.estimate.toFixed(2)} ({event.currency})</p>
                    ) : (
                        <p className="text-muted-foreground">EPS Est: N/A</p>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
            <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                Earnings data as of {/* <<< MODIFIED LINE */}
                {isClientMounted ? formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true }) : "a moment ago"}
            </p>
        )}
         <div className="mt-1 text-center">
            <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Earnings data powered by Alpha Vantage
            </a>
        </div>
      </CardContent>
    </Card>
  );
}