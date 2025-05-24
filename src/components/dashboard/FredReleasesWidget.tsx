// File: src/components/dashboard/FredReleasesWidget.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { FredReleaseDate } from '@/lib/api'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, Info } from 'lucide-react';
import { 
    format, 
    parseISO, 
    isToday as dateFnsIsToday,
    isTomorrow as dateFnsIsTomorrow, 
    isValid, 
    startOfToday, 
    formatDistanceToNowStrict, 
    getYear,
    getMonth, 
    getDate   
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
  
  const clientTodayParts = useMemo(() => {
    if (isClientMounted) {
      const now = new Date(); 
      return {
        year: getYear(now),
        month: getMonth(now), 
        day: getDate(now)    
      };
    }
    return null; 
  }, [isClientMounted]);

  useEffect(() => {
      setIsClientMounted(true);
      // console.log("[FredReleasesWidget] Mounted. Client Today Parts:", clientTodayParts);
      // console.log("[FredReleasesWidget] initialReleases (count):", initialReleases.length);
  }, []); // Removed dependencies to only log once on mount, or add them back if needed for re-log


  useEffect(() => {
    if (isClientMounted && clientTodayParts && Array.isArray(initialReleases)) {
      console.log("--- [FredReleasesWidget FILTERING LOG] ---");
      console.log("Client Today Parts:", clientTodayParts);
      console.log("Initial Releases Count:", initialReleases.length);

      const futureAndTodayReleases = initialReleases
        .filter((release, index) => { // Added index for logging limit
            if (!release.date) return false;
            
            const releaseDateObj = parseISO(release.date);
            if (!isValid(releaseDateObj)) return false;

            const releaseYear = getYear(releaseDateObj);
            const releaseMonth = getMonth(releaseDateObj); 
            const releaseDay = getDate(releaseDateObj);

            let include = false;
            if (releaseYear > clientTodayParts.year) {
                include = true;
            } else if (releaseYear === clientTodayParts.year) {
                if (releaseMonth > clientTodayParts.month) {
                    include = true;
                } else if (releaseMonth === clientTodayParts.month) {
                    if (releaseDay >= clientTodayParts.day) {
                        include = true;
                    }
                }
            }
            
            // Log comparison for the first, say, 10 items from initialReleases
            if (index < 10) {
                console.log(
                    `  Filtering Item ${index}: Name: "${release.release_name.substring(0,20)}..."\n` +
                    `    Raw Date: "${release.date}" -> Parsed Parts: Y=${releaseYear}, M=${releaseMonth}, D=${releaseDay}\n` +
                    `    ClientTodayParts: Y=${clientTodayParts.year}, M=${clientTodayParts.month}, D=${clientTodayParts.day}\n` +
                    `    Include? ${include}`
                );
            }
            return include;
        })
        .sort((a,b) => { 
            const dateA = parseISO(a.date);
            const dateB = parseISO(b.date);
            if (!isValid(dateA) || !isValid(dateB)) return 0;
            return dateA.getTime() - dateB.getTime();
        });
      
      console.log("FutureAndTodayReleases after filter (count):", futureAndTodayReleases.length);
      if(futureAndTodayReleases.length > 0) {
        console.log("FutureAndTodayReleases sample (first 2):", JSON.stringify(futureAndTodayReleases.slice(0,2)));
      }
      console.log("--- [FredReleasesWidget END FILTERING LOG] ---");
      
      setReleasesToDisplay(futureAndTodayReleases.slice(0, itemCount));
    } else {
      setReleasesToDisplay([]);
    }
  }, [initialReleases, itemCount, isClientMounted, clientTodayParts]); 


  const getDateDisplay = (dateStr: string): string => {
    if (!dateStr || !isValid(parseISO(dateStr))) return "Date N/A";
    const date = parseISO(dateStr); 
    if (clientTodayParts && dateFnsIsToday(date)) return "Today"; 
    if (clientTodayParts && dateFnsIsTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const noUpcomingFromInitial = isClientMounted && initialReleases.length > 0 && releasesToDisplay.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center">
          <CalendarCheck className="h-5 w-5 mr-2 text-cyan-500" />
          Upcoming FRED Releases
        </CardTitle>
        {isClientMounted && releasesToDisplay.length === 0 && (
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>
                        {noUpcomingFromInitial ? 
                         "No FRED releases scheduled for today or upcoming dates from the current data." :
                         "No FRED data releases found or all are in the past."
                        }
                    </p>
                </TooltipContent>
            </Tooltip></TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {!isClientMounted && releasesToDisplay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading releases...</p>
        ) : releasesToDisplay.length === 0 && isClientMounted ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {noUpcomingFromInitial ? 
             "No upcoming FRED releases for today or future dates." :
             "No FRED releases found in the recently updated schedule."
            }
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