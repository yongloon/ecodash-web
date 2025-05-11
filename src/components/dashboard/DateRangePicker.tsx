// src/components/dashboard/DateRangePicker.tsx
"use client";

import * as React from "react";
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
      return { from: fromDate, to: toDate };
    }
    const fiveYearsAgo = subYears(new Date(), 5);
    return { from: startOfMonth(fiveYearsAgo), to: endOfMonth(new Date()) };
  });

  const [popoverOpen, setPopoverOpen] = React.useState(false);

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
      router.push(`${pathname}${query}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, pathname]); // Removed router to prevent re-triggering from its own change

  React.useEffect(() => {
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    let fromDate, toDate;

    if (startParam && isValid(new Date(startParam))) fromDate = new Date(startParam);
    if (endParam && isValid(new Date(endParam))) toDate = new Date(endParam);

    const localFromFormatted = date?.from && isValid(date.from) ? format(date.from, "yyyy-MM-dd") : null;
    const localToFormatted = date?.to && isValid(date.to) ? format(date.to, "yyyy-MM-dd") : null;

    if ( (startParam && startParam !== localFromFormatted) || (!startParam && localFromFormatted) ||
         (endParam && endParam !== localToFormatted) || (!endParam && localToFormatted) ) {
      if (fromDate && toDate) {
        setDate({ from: fromDate, to: toDate });
      } else {
        const fiveYearsAgo = subYears(new Date(), 5);
        setDate({ from: startOfMonth(fiveYearsAgo), to: endOfMonth(new Date()) });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


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
            onSelect={(newDate) => {
                setDate(newDate);
                if (newDate?.from && newDate.to && isValid(newDate.from) && isValid(newDate.to)) {
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