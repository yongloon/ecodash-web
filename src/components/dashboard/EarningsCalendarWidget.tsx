// src/components/dashboard/EarningsCalendarWidget.tsx
"use client";

import React from 'react'; // Removed useState, useEffect
import { EarningsEventAV } from '@/lib/api'; // Use the AV interface
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Info } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EarningsCalendarWidgetProps {
    initialEvents?: EarningsEventAV[];
    horizon?: '3month' | '6month' | '12month'; // Still useful for context
    itemCount?: number;
    // symbol prop might not be needed if parent fetches all and widget just displays
}

export default function EarningsCalendarWidget({
    initialEvents = [], // Default to empty array
    horizon = '3month',
    itemCount = 6,
}: EarningsCalendarWidgetProps) {
  // Data is now passed via props
  const eventsToDisplay = initialEvents.slice(0, itemCount);

  const getDateDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr || !isValid(parseISO(dateStr))) return "Date N/A";
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
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
                        <p>No earnings releases found for the upcoming period. This could be due to API limitations or a quiet period.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {eventsToDisplay.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No earnings releases currently listed for the {horizon.replace('month', ' month')} horizon.
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
                                <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate cursor-default" title={event.name}>
                                    {event.symbol}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                                {event.name}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="text-muted-foreground font-medium">{getDateDisplay(event.reportDate)}</span>
                </div>
                {event.estimate !== null && <p className="text-muted-foreground text-xs">EPS Est: {event.estimate?.toFixed(2) ?? 'N/A'} ({event.currency})</p>}
              </li>
            ))}
          </ul>
        )}
         <div className="mt-4 text-center">
            <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Earnings data powered by Alpha Vantage
            </a>
        </div>
      </CardContent>
    </Card>
  );
}