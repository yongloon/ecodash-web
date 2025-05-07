// src/components/dashboard/CountrySelector.tsx
'use client'; // Needs state

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation'; // Import hooks for URL state
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Assuming Shadcn/ui Select

// Basic Country Selector - Uses URL query parameter 'country'
export default function CountrySelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state from URL or default to 'US'
  const [selectedCountry, setSelectedCountry] = useState(() => {
      return searchParams.get('country') || 'US';
  });

  // Update state if URL changes externally
  useEffect(() => {
    const countryFromUrl = searchParams.get('country') || 'US';
    if (countryFromUrl !== selectedCountry) {
      setSelectedCountry(countryFromUrl);
    }
  }, [searchParams, selectedCountry]);


  // TODO: Fetch available countries dynamically if needed
  // For now, using a static list. In a real app, this might depend on API capabilities.
  const countries = [
    { value: 'US', label: '🇺🇸 United States' },
    // Add more countries here ONLY if your APIs support them for the indicators
    // { value: 'CA', label: '🇨🇦 Canada' },
    // { value: 'GB', label: '🇬🇧 United Kingdom' },
    // { value: 'DE', label: '🇩🇪 Germany' },
    // { value: 'JP', label: '🇯🇵 Japan' },
  ];

  const handleValueChange = (value: string) => {
    setSelectedCountry(value);

    // Update the URL query parameter
    const current = new URLSearchParams(Array.from(searchParams.entries())); // Create mutable copy

    if (!value || value === 'US') { // Remove param if default 'US' or empty
        current.delete('country');
    } else {
        current.set('country', value);
    }

    // Cast to string
    const search = current.toString();
    const query = search ? `?${search}` : "";

    // Use router.push to navigate, triggering data refetch on pages using searchParams
    router.push(`${pathname}${query}`);

    console.log("Selected Country:", value);
    // Pages using `searchParams` in Server Components will re-render
    // Client components might need `useEffect` hook watching `searchParams` to refetch
  };

  return (
    <Select value={selectedCountry} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[180px] text-sm h-9"> {/* Adjusted size */}
        <SelectValue placeholder="Select Country" />
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.value} value={country.value}>
            {country.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
