// File: src/components/dashboard/FredReleasesWidget.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FredReleaseDate } from '@/lib/api'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Info } from 'lucide-react';
import { 
    format, 
    parseISO, // parseISO is fine for well-formatted "YYYY-MM-DD"
    isToday as dateFnsIsToday,
    isTomorrow as dateFnsIsTomorrow, 
    isValid, 
    startOfDay, // For getDateDisplay context
    formatDistanceToNowStrict, 
} from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FredReleasesWidgetProps {
    initialReleases?: FredReleaseDate[];
    itemCount?: number; 
    dataTimestamp?: string;
}

export default function FredReleasesWidget({
    initialReleases = [],
    itemCount = 5,
    dataTimestamp
}: FredReleasesWidgetProps) {
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [releasesToDisplay, setReleasesToDisplay] = useState<FredReleaseDate[]>([]);
  
  // Memoize client's "start of today" primarily for getDateDisplay's "Today"/"Tomorrow" labels
  const clientStartOfDay = useMemo(() => {
    if (isClientMounted) {
      return startOfDay(new Date()); 
    }
    return null; 
  }, [isClientMounted]);

  useEffect(() => {
      setIsClientMounted(true);
  }, []);


  useEffect(() => {
    if (isClientMounted && Array.isArray(initialReleases)) {
      // Sort initialReleases by date in descending order (most recent 'date' first)
      // Then take the top 'itemCount'.
      const sortedReleases = [...initialReleases] 
        .filter(release => release.date && isValid(parseISO(release.date))) // Ensure valid dates before sorting
        .sort((a,b) => { 
            // No need to parse if already sorted by API, but if not, parse before comparing
            const dateA = parseISO(a.date); // Assuming a.date and b.date are valid at this point
            const dateB = parseISO(b.date);
            return dateB.getTime() - dateA.getTime(); // Descending sort for "latest"
        });
      
      setReleasesToDisplay(sortedReleases.slice(0, itemCount));
    } else {
      setReleasesToDisplay([]);
    }
  }, [initialReleases, itemCount, isClientMounted]);


  const getDateDisplay = (dateStr: string): string => {
    if (!dateStr || !isValid(parseISO(dateStr))) return "Date N/A";
    const date = parseISO(dateStr); 
    // Use clientStartOfDay for accurate "Today"/"Tomorrow" relative to client for display purposes
    if (clientStartOfDay && dateFnsIsToday(date)) return "Today"; 
    if (clientStartOfDay && dateFnsIsTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarCheck className="h-5 w-5 mr-2 text-cyan-500" />
          Latest FRED Releases
        </CardTitle>
        {isClientMounted && releasesToDisplay.length === 0 && initialReleases.length > 0 && (
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>No valid FRED releases found in the provided data after sorting.</p>
                </TooltipContent>
            </Tooltip></TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {!isClientMounted && releasesToDisplay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading releases...</p>
        ) : releasesToDisplay.length === 0 && isClientMounted ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No FRED releases found in the schedule.
          </p>
        ) : (
          <ul className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {releasesToDisplay.map((release) => (
              <li key={`${release.release_id}-${release.date}`} 
                  className={`border-b border-border/30 pb-2.5 last:border-b-0 last:pb-0 text-xs`}>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate cursor-default max-w-[70%]" title={release.release_name}>
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
        {dataTimestamp && isValid(parseISO(dataTimestamp)) && (
            <p className="mt-3 pt-3 border-t border-border/30 text-center text-xs text-muted-foreground/80">
                Release schedule as of {isClientMounted ? formatDistanceToNowStrict(parseISO(dataTimestamp), { addSuffix: true }) : "a moment ago"}
            </p>
        )}
         <div className="mt-1 text-center">
            <a href="https://fred.stlouisfed.org/releases" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary">
                Data release calendar by FRED
            </a>
        </div>
      </CardContent>
    </Card>
  );
}