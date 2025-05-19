// src/app/(dashboard)/category/[slug]/IndicatorScroll.tsx
"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function IndicatorScroll() {
  const searchParams = useSearchParams();
  const indicatorId = searchParams.get('indicator');
  const hasScrolledRef = useRef(false); // To prevent scrolling on every re-render if params don't change

  useEffect(() => {
    // Only scroll if indicatorId is present and we haven't scrolled for this ID yet
    if (indicatorId && !hasScrolledRef.current) {
      const attemptScroll = () => {
        const element = document.getElementById(`indicator-${indicatorId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Optional: Add a temporary visual highlight
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'dark:ring-offset-background', 'transition-all', 'duration-300', 'ease-out', 'rounded-lg');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'dark:ring-offset-background');
          }, 2500); // Remove highlight after 2.5 seconds
          hasScrolledRef.current = true; // Mark as scrolled for this ID load
        } else {
          // Element might not be rendered yet, retry briefly
          // console.log(`IndicatorScroll: Element indicator-${indicatorId} not found, will retry.`);
        }
      };
      
      // Attempt scroll after a short delay to allow elements to render
      // This is a common pattern for scrolling after navigation in React/Next.js
      const timeoutId = setTimeout(attemptScroll, 300);

      // If multiple fast navigations occur, we only want the latest scroll attempt
      return () => {
        clearTimeout(timeoutId);
        // Reset hasScrolledRef if the indicatorId in the URL changes,
        // allowing a scroll for the new indicator.
        // This logic might need refinement if you expect frequent param changes without full page reload.
        // For now, this handles initial load with param.
      };
    } else if (!indicatorId) {
      // If indicatorId is removed from URL, reset the scrolled flag
      hasScrolledRef.current = false;
    }
  }, [indicatorId]); // Re-run effect if indicatorId changes

  // This effect helps reset the scroll lock if the user navigates away and back
  // to the same category page but *without* an indicatorId param initially.
  useEffect(() => {
    if (!indicatorId) {
      hasScrolledRef.current = false;
    }
  }, [indicatorId]);


  return null; // This component doesn't render any visible UI
}