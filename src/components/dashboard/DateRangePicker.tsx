// src/components/dashboard/DateRangePicker.tsx
"use client";

import * as React from "react";
// MODIFIED: Ensure subYears is imported
import { format, subYears, isValid, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// --- HELPER FUNCTION FOR DEFAULT DATE RANGE ---
function getDefaultDateRange(): DateRange {
  const today = new Date();
  // --- MODIFIED: Default to Last 1 Year from today ---
  // The 'from' date will be exactly one year ago from today.
  // The 'to' date will be today.
  const oneYearAgo = subYears(today, 1);
  return { from: oneYearAgo, to: today };
}

export function DateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    let fromDate, toDate;

    if (startParam && isValid(new Date(startParam))) {
      fromDate = new Date(startParam);
    }
    if (endParam && isValid(new Date(endParam))) {
      toDate = new Date(endParam);
    }

    if (fromDate && toDate && isValid(fromDate) && isValid(toDate)) {
      // If URL params are valid and provide a complete range, use them.
      // Ensure 'from' is not after 'to'. If so, maybe use default or adjust.
      if (fromDate <= toDate) {
        return { from: fromDate, to: toDate };
      } else {
        console.warn("DateRangePicker: Start date from URL is after end date. Using default.");
        return getDefaultDateRange();
      }
    } else if (fromDate && isValid(fromDate) && !toDate) {
      // If only a valid start date is in URL, set 'to' to today for a valid range.
      return { from: fromDate, to: new Date() };
    }
    // --- MODIFIED: Use helper for default if URL params are missing or incomplete/invalid ---
    return getDefaultDateRange();
  });

  const [popoverOpen, setPopoverOpen] = React.useState(false);

  // Effect to update URL when local date state changes
  React.useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    let changed = false;

    const currentUrlStart = current.get("startDate");
    const currentUrlEnd = current.get("endDate");

    if (date?.from && isValid(date.from)) {
      const formattedFrom = format(date.from, "yyyy-MM-dd");
      if (currentUrlStart !== formattedFrom) {
        current.set("startDate", formattedFrom);
        changed = true;
      }
    } else {
      if (currentUrlStart) {
        current.delete("startDate");
        changed = true;
      }
    }

    if (date?.to && isValid(date.to)) {
      const formattedTo = format(date.to, "yyyy-MM-dd");
      if (currentUrlEnd !== formattedTo) {
        current.set("endDate", formattedTo);
        changed = true;
      }
    } else {
      if (currentUrlEnd) {
        current.delete("endDate");
        changed = true;
      }
    }

    if (changed) {
      const query = current.toString() ? `?${current.toString()}` : "";
      router.push(`${pathname}${query}`, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, pathname]); // Removed router from deps

  // Effect to update local date state if URL searchParams change
  React.useEffect(() => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    let fromDate, toDate;

    if (startParam && isValid(new Date(startParam))) fromDate = new Date(startParam);
    if (endParam && isValid(new Date(endParam))) toDate = new Date(endParam);

    const defaultRange = getDefaultDateRange();
    const defaultFromFormatted = format(defaultRange.from as Date, "yyyy-MM-dd");
    const defaultToFormatted = format(defaultRange.to as Date, "yyyy-MM-dd");

    const localFromFormatted = date?.from && isValid(date.from) ? format(date.from, "yyyy-MM-dd") : null;
    const localToFormatted = date?.to && isValid(date.to) ? format(date.to, "yyyy-MM-dd") : null;

    const urlStartIsDifferent = startParam && startParam !== localFromFormatted;
    const urlStartMissingAndLocalNotDefault = !startParam && localFromFormatted && localFromFormatted !== defaultFromFormatted;
    const urlEndIsDifferent = endParam && endParam !== localToFormatted;
    const urlEndMissingAndLocalNotDefault = !endParam && localToFormatted && localToFormatted !== defaultToFormatted;

    if (urlStartIsDifferent || urlStartMissingAndLocalNotDefault || urlEndIsDifferent || urlEndMissingAndLocalNotDefault) {
      if (fromDate && toDate && isValid(fromDate) && isValid(toDate) && fromDate <= toDate) {
        setDate({ from: fromDate, to: toDate });
      } else if (fromDate && isValid(fromDate) && !toDate) {
        setDate({ from: fromDate, to: new Date() }); // Default 'to' to today if only start is valid in URL
      }
       else {
        setDate(defaultRange);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Removed 'date' from deps


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[230px] md:w-[260px] justify-start text-left font-normal h-9 text-xs sm:text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 md:mr-2 h-4 w-4" />
            {date?.from && isValid(date.from) ? (
              date.to && isValid(date.to) ? (
                <>
                  {format(date.from, "LLL dd, yy")} -{" "}
                  {format(date.to, "LLL dd, yy")}
                </>
              ) : (
                format(date.from, "LLL dd, yy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(newDateRange) => {
                setDate(newDateRange);
                if (newDateRange?.from && newDateRange?.to && isValid(newDateRange.from) && isValid(newDateRange.to)) {
                    setPopoverOpen(false);
                }
            }}
            numberOfMonths={2}
            disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}