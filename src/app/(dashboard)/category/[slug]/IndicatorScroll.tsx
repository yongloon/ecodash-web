// File: src/app/(dashboard)/category/[slug]/IndicatorScroll.tsx
// src/app/(dashboard)/category/[slug]/IndicatorScroll.tsx
"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';

export default function IndicatorScroll() {
  const searchParams = useSearchParams();
  const indicatorId = searchParams.get('indicator');
  const hasScrolledRef = useRef(false);
  const targetElementRef = useRef<HTMLDivElement | null>(null);

  const scrollToElement = useCallback(() => {
    if (targetElementRef.current) {
      targetElementRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElementRef.current.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'dark:ring-offset-background', 'transition-all', 'duration-300', 'ease-out', 'rounded-lg');
      setTimeout(() => {
        targetElementRef.current?.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'dark:ring-offset-background');
      }, 2500);
      hasScrolledRef.current = true;
    }
  }, []); // Empty dependency array: scrollToElement itself doesn't depend on external state props

  useEffect(() => {
    // Reset scroll lock if indicatorId changes or is removed
    if (indicatorId) { // Only reset if there *was* an indicatorId before change
        // Check if this is a *new* indicatorId compared to the one potentially stored in targetElementRef
        const currentTargetId = targetElementRef.current?.id.replace('indicator-', '');
        if (currentTargetId !== indicatorId) {
            hasScrolledRef.current = false;
        }
    } else {
        hasScrolledRef.current = false;
    }
  }, [indicatorId]);

  useEffect(() => {
    if (indicatorId && !hasScrolledRef.current) {
      const element = document.getElementById(`indicator-${indicatorId}`);
      if (element) {
        targetElementRef.current = element as HTMLDivElement;
        const rafId = requestAnimationFrame(scrollToElement);
        return () => cancelAnimationFrame(rafId);
      } else {
        // Element might not be rendered yet, retry briefly
        const timeoutId = setTimeout(() => {
            const el = document.getElementById(`indicator-${indicatorId}`);
            if (el) {
                targetElementRef.current = el as HTMLDivElement;
                scrollToElement();
            }
        }, 100); // Short delay for elements that might take a moment to appear
        return () => clearTimeout(timeoutId);
      }
    }
  }, [indicatorId, scrollToElement]); // scrollToElement is memoized, so this effect runs when indicatorId changes

  return null;
}