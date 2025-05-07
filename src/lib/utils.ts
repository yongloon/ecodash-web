import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// cn function (commonly used with Shadcn/ui) for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add other utility functions here as needed
// Example: Format number with commas
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString();
}

// Example: Get date range for API calls (e.g., last N years)
import { subYears, format } from 'date-fns';

export function getDateRange(years: number): { startDate: string, endDate: string } {
    const endDate = new Date();
    const startDate = subYears(endDate, years);
    return {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
    };
}
