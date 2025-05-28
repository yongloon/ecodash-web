// src/hooks/useFavorites.ts
"use client";

import useSWR, { SWRConfiguration } from 'swr';
import toast from 'react-hot-toast';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data from the API.');
        try {
            const errorInfo = await res.json();
            (error as any).info = errorInfo;
            console.error(`API Error (${res.status}) for ${url}:`, errorInfo);
        } catch (e) {
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
        throw error;
    }
    return res.json();
};

const swrOptions: SWRConfiguration = {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    // Keep default error retry behavior unless it becomes problematic
    // onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    //   // Never retry on 404.
    //   if (error.status === 404) return
    //   // Never retry for specific key.
    //   if (key === '/api/users/favorites' && error.status === 403) return // Example: Don't retry if auth issue
    //   // Only retry up to 3 times.
    //   if (retryCount >= 3) return
    //   // Retry after 5 seconds.
    //   setTimeout(() => revalidate({ retryCount }), 5000)
    // }
};

export function useFavorites() {
  const { 
    data: favoriteIds, 
    error: favoritesError,
    isLoading: isLoadingFavorites, 
    mutate: mutateFavorites 
  } = useSWR<string[]>('/api/users/favorites', fetcher, swrOptions);

  const addFavorite = async (indicatorId: string) => {
    const currentFavorites = favoriteIds || [];
    if (currentFavorites.includes(indicatorId)) return;

    // Optimistic update
    mutateFavorites([...currentFavorites, indicatorId], false); 
    
    const promise = fetch('/api/users/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId }),
    }).then(async (res) => {
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Failed to add favorite. Server error." }));
            // Revert optimistic update on failure
            mutateFavorites(currentFavorites, false); 
            throw new Error(errorData.error || 'Server error adding favorite');
        }
        // No specific data needed from response for success, but could parse if API returns the new favorite object
        // return res.json(); 
        mutateFavorites(); // Revalidate from server to ensure consistency
        return 'Added to favorites!'; // Message for toast.success
    }).catch(err => {
        // Ensure reversion if any part of the promise chain fails
        mutateFavorites(currentFavorites, false);
        throw err; // Re-throw for toast.promise to catch
    });

    toast.promise(promise, {
        loading: 'Adding to favorites...',
        success: (message) => message, // Use the resolved message from the promise
        error: (err) => `Error: ${err.message || 'Could not add favorite.'}`,
    });
  };

  const removeFavorite = async (indicatorId: string) => {
    const currentFavorites = favoriteIds || [];
    if (!currentFavorites.includes(indicatorId)) return;

    // Optimistic update
    mutateFavorites(currentFavorites.filter(id => id !== indicatorId), false);
    
    const promise = fetch(`/api/users/favorites?indicatorId=${encodeURIComponent(indicatorId)}`, {
        method: 'DELETE',
    }).then(async (res) => {
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Failed to remove favorite. Server error." }));
            // Revert optimistic update
            mutateFavorites(currentFavorites, false);
            throw new Error(errorData.error || 'Server error removing favorite');
        }
        mutateFavorites(); // Revalidate from server
        return 'Removed from favorites!';
    }).catch(err => {
        mutateFavorites(currentFavorites, false);
        throw err;
    });

    toast.promise(promise, {
        loading: 'Removing from favorites...',
        success: (message) => message,
        error: (err) => `Error: ${err.message || 'Could not remove favorite.'}`,
    });
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
    mutateFavorites, // Expose mutate for external revalidation if needed
  };
}