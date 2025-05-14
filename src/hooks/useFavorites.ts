// src/hooks/useFavorites.ts
"use client";

import useSWR, { SWRConfiguration } from 'swr'; // Import SWRConfiguration for options

// Enhanced fetcher to provide more error details
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data from the API.');
        try {
            // Attempt to parse JSON error from API response body
            const errorInfo = await res.json();
            (error as any).info = errorInfo; // Contains API specific error message
            console.error(`API Error (${res.status}) for ${url}:`, errorInfo);
        } catch (e) {
            // If parsing JSON fails, use text and then fallback
            try {
                const errorText = await res.text();
                (error as any).info = { message: errorText || "Unknown API error (non-JSON response)." };
                 console.error(`API Error (${res.status}) for ${url} (non-JSON):`, errorText);
            } catch (textError) {
                (error as any).info = { message: `HTTP error ${res.status} and failed to read response body.` };
                 console.error(`API Error (${res.status}) for ${url} (unreadable body):`, textError);
            }
        }
        (error as any).status = res.status;
        throw error; // SWR will catch this and put it in the 'error' state
    }
    return res.json();
};

// Optional SWR configuration
const swrOptions: SWRConfiguration = {
    revalidateOnFocus: true, // Revalidate when window gets focus
    revalidateOnReconnect: true, // Revalidate on network reconnect
    // dedupingInterval: 2000, // Default is 2000ms
};

export function useFavorites() {
  // The key for SWR is '/api/users/favorites'. This will make a GET request.
  const { 
    data: favoriteIds, 
    error: favoritesError, // This will contain the error thrown by the fetcher
    isLoading: isLoadingFavorites, 
    mutate: mutateFavorites 
  } = useSWR<string[]>('/api/users/favorites', fetcher, swrOptions);

  const addFavorite = async (indicatorId: string) => {
    const currentFavorites = favoriteIds || [];
    if (currentFavorites.includes(indicatorId)) return;

    // Optimistic update
    mutateFavorites([...currentFavorites, indicatorId], false);

    try {
      const res = await fetch('/api/users/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to add favorite" }));
        throw new Error(errorData.error || 'Server error adding favorite');
      }
      // No need to call mutate() again if server confirms, SWR might revalidate based on other factors
      // or if you want to be absolutely sure: mutateFavorites();
    } catch (e: any) {
      // Revert optimistic update on error
      mutateFavorites(currentFavorites, false); 
      console.error("Failed to add favorite:", e.message);
      alert(`Error: ${e.message}`); // Or use a toast
    }
  };

  const removeFavorite = async (indicatorId: string) => {
    const currentFavorites = favoriteIds || [];
    if (!currentFavorites.includes(indicatorId)) return;

    // Optimistic update
    mutateFavorites(currentFavorites.filter(id => id !== indicatorId), false);

    try {
      const res = await fetch(`/api/users/favorites?indicatorId=${encodeURIComponent(indicatorId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to remove favorite" }));
        throw new Error(errorData.error || 'Server error removing favorite');
      }
      // mutateFavorites(); // Optional revalidation
    } catch (e: any) {
      // Revert optimistic update
      mutateFavorites(currentFavorites, false);
      console.error("Failed to remove favorite:", e.message);
      alert(`Error: ${e.message}`); // Or use a toast
    }
  };

  const isFavorited = (indicatorId: string): boolean => {
    return !!favoriteIds && favoriteIds.includes(indicatorId);
  };

  return {
    favoriteIds: favoriteIds || [],
    isLoadingFavorites,
    favoritesError,
    addFavorite,
    removeFavorite,
    isFavorited,
    mutateFavorites,
  };
}