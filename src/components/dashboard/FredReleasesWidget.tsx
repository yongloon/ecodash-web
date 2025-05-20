// src/components/dashboard/FredReleasesWidget.tsx
"use client";

import React from 'react';
import { FredReleaseDate } from '@/lib/api'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Info } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isValid, startOfToday } from 'date-fns'; // Added startOfToday
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FredReleasesWidgetProps {
    initialReleases?: FredReleaseDate[];
    itemCount?: number; // You requested latest 5 for this widget
}

export default function FredReleasesWidget({
    initialReleases = [],
    itemCount = 5, // Defaulting to 5 as requested
}: FredReleasesWidgetProps) {
  // console.log(`[FredReleasesWidget] Raw initialReleases count: ${initialReleases.length}`);

  const today = startOfToday(); // Get the start of today for comparison

  // Filter for releases that are scheduled for today or in the future, then sort
  const futureAndTodayReleases = initialReleases
    .filter(release => {
        if (!release.date || !isValid(parseISO(release.date))) return false;
        return parseISO(release.date) >= today; // Compare with start of today
    })
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ensure sorted by actual release date

  const releasesToDisplay = futureAndTodayReleases.slice(0, itemCount);
  // console.log(`[FredReleasesWidget] Releases to display after filtering for future and slicing: ${releasesToDisplay.length}`);

  const getDateDisplay = (dateStr: string): string => {
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
          <CalendarCheck className="h-5 w-5 mr-2 text-cyan-500" />
          Upcoming FRED Releases
        </CardTitle>
        {releasesToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs"><p>No upcoming FRED data releases found in the recently updated schedule.</p></TooltipContent>
            </Tooltip></TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {releasesToDisplay.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming FRED releases found in the recently updated schedule.
          </p>
        ) : (
          <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {releasesToDisplay.map((release) => (
              <li key={`${release.release_id}-${release.date}`} className="border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate cursor-default" title={release.release_name}>
                        {release.release_name}
                    </span>
                    <span className="text-muted-foreground font-medium">{getDateDisplay(release.date)}</span>
                </div>
                 <a 
                    href={`https://fred.stlouisfed.org/release?rid=${release.release_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                 >
                    View on FRED
                 </a>
              </li>
            ))}
          </ul>
        )}
         <div className="mt-4 text-center">
            <a href="https://fred.stlouisfed.org/releases" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Data release calendar by FRED
            </a>
        </div>
      </CardContent>
    </Card>
  );
}