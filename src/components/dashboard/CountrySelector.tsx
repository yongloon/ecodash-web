// src/components/dashboard/CountrySelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CountrySelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCountry, setSelectedCountry] = useState(() => {
      return searchParams.get('country') || 'US';
  });

  useEffect(() => {
    const countryFromUrl = searchParams.get('country') || 'US';
    if (countryFromUrl !== selectedCountry) {
      setSelectedCountry(countryFromUrl);
    }
  }, [searchParams, selectedCountry]);

  const countries = [
    { value: 'US', label: '🇺🇸 United States' },
    // { value: 'CA', label: '🇨🇦 Canada' },
    // { value: 'GB', label: '🇬🇧 United Kingdom' },
    // { value: 'DE', label: '🇩🇪 Germany' },
    // { value: 'JP', label: '🇯🇵 Japan' },
  ];

  const handleValueChange = (value: string) => {
    setSelectedCountry(value);
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    if (!value || value === 'US') {
        current.delete('country');
    } else {
        current.set('country', value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  return (
    <Select value={selectedCountry} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[170px] md:w-[180px] text-sm h-9">
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