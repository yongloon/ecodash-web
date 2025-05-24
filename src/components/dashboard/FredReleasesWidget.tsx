// src/components/dashboard/FredReleasesWidget.tsx
"use client";

import React from 'react';
import { FredReleaseDate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Info, History } from 'lucide-react'; // Added History icon
import { format, parseISO, isToday, isTomorrow, isValid, startOfToday, isPast } from 'date-fns'; // Added isPast
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FredReleasesWidgetProps {
    initialReleases?: FredReleaseDate[];
    itemCount?: number;
}

export default function FredReleasesWidget({
    initialReleases = [],
    itemCount = 5,
}: FredReleasesWidgetProps) {

  const today = startOfToday();
  let widgetTitle = "Upcoming FRED Releases";
  let titleIcon = <CalendarCheck className="h-5 w-5 mr-2 text-cyan-500" />;
  let noDataMessage = "No upcoming FRED releases found in the schedule.";

  // 1. Try to get strictly upcoming releases
  let upcomingReleases = initialReleases.filter(release => {
      if (!release.date) return false;
      try {
          const releaseDate = parseISO(release.date);
          return isValid(releaseDate) && releaseDate >= today;
      } catch (e) { return false; }
  }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ensure sorted

  let releasesToDisplay = upcomingReleases.slice(0, itemCount);

  // 2. If no (or very few) upcoming, show the most recent scheduled (could be past)
  if (releasesToDisplay.length === 0 && initialReleases.length > 0) {
      widgetTitle = "Recent & Upcoming FRED Releases";
      titleIcon = <History className="h-5 w-5 mr-2 text-blue-500" />; // Changed icon
      noDataMessage = "No FRED releases found in the recent schedule."; // More generic

      // Take the last N items from the sorted initialReleases (which could be past)
      // if initialReleases is sorted ascending by date, these would be the latest scheduled.
      // Or, to be safer, re-sort initialReleases by date descending if we want truly "most recent by schedule date"
      const sortedAllReleases = [...initialReleases].sort((a,b) => {
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          if (!isValid(dateA)) return 1;
          if (!isValid(dateB)) return -1;
          return dateB.getTime() - dateA.getTime(); // Sort descending to get most recent first
      });
      releasesToDisplay = sortedAllReleases.slice(0, itemCount).sort((a,b) => { // Then re-sort ascending for display
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          if (!isValid(dateA)) return 1;
          if (!isValid(dateB)) return -1;
          return dateA.getTime() - dateB.getTime();
      });
  }


  const getDateDisplay = (dateStr: string): string => {
    if (!dateStr) return "Date N/A";
    try {
        const date = parseISO(dateStr);
        if (!isValid(date)) return "Invalid Date";
        if (isToday(date)) return "Today";
        if (isTomorrow(date)) return "Tomorrow";
        if (isPast(date) && !isToday(date)) return `${format(date, "MMM d, yyyy")} (Past)`;
        return format(date, "MMM d, yyyy");
    } catch (e) {
        return "Date Error";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          {titleIcon}
          {widgetTitle}
        </CardTitle>
        {releasesToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs"><p>{noDataMessage}</p></TooltipContent>
            </Tooltip></TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {releasesToDisplay.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {noDataMessage}
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