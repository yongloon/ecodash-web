// src/hooks/useFavorites.ts
"use client";

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        // Attach extra info to the error object.
        (error as any).info = res.json(); // Or res.text()
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
});

export function useFavorites() {
  const { data: favoriteIds, error, isLoading, mutate } = useSWR<string[]>('/api/users/favorites', fetcher);

  const addFavorite = async (indicatorId: string) => {
    if (!favoriteIds || favoriteIds.includes(indicatorId)) return; // Already favorited or data not loaded

    // Optimistic update
    mutate([...favoriteIds, indicatorId], false);

    try {
      const res = await fetch('/api/users/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId }),
      });
      if (!res.ok) {
        throw new Error('Failed to add favorite');
      }
      // Revalidate after successful API call (optional, if optimistic update is not enough)
      // mutate(); 
    } catch (e) {
      // Revert optimistic update on error
      mutate(favoriteIds, false); 
      console.error("Failed to add favorite:", e);
      // Handle error (e.g., show toast)
    }
  };

  const removeFavorite = async (indicatorId: string) => {
    if (!favoriteIds || !favoriteIds.includes(indicatorId)) return;

    // Optimistic update
    mutate(favoriteIds.filter(id => id !== indicatorId), false);

    try {
      const res = await fetch(`/api/users/favorites?indicatorId=${encodeURIComponent(indicatorId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove favorite');
      }
      // mutate(); 
    } catch (e) {
      // Revert optimistic update
      mutate(favoriteIds, false);
      console.error("Failed to remove favorite:", e);
      // Handle error
    }
  };

  const isFavorited = (indicatorId: string): boolean => {
    return !!favoriteIds && favoriteIds.includes(indicatorId);
  };

  return {
    favoriteIds: favoriteIds || [], // Default to empty array if undefined
    isLoadingFavorites: isLoading,
    favoritesError: error,
    addFavorite,
    removeFavorite,
    isFavorited,
    mutateFavorites: mutate, // Expose mutate for manual revalidation if needed
  };
}