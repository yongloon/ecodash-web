// src/hooks/useFavorites.ts
"use client";

import useSWR, { SWRConfiguration } from 'swr';
import toast from 'react-hot-toast'; // <<< ADD THIS

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

    mutateFavorites([...currentFavorites, indicatorId], false);
    toast.promise(
        fetch('/api/users/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indicatorId }),
        }).then(async (res) => {
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to add favorite" }));
                throw new Error(errorData.error || 'Server error adding favorite');
            }
            return res.json(); // Or just nothing if no specific data needed from response
        }),
        {
            loading: 'Adding to favorites...',
            success: () => {
                // mutateFavorites(); // Optionally revalidate if needed, but optimistic should be fine
                return 'Added to favorites!';
            },
            error: (err) => {
                mutateFavorites(currentFavorites, false); // Revert
                return `Error: ${err.message || 'Could not add favorite.'}`;
            },
        }
    );
  };

  const removeFavorite = async (indicatorId: string) => {
    const currentFavorites = favoriteIds || [];
    if (!currentFavorites.includes(indicatorId)) return;

    mutateFavorites(currentFavorites.filter(id => id !== indicatorId), false);
    toast.promise(
        fetch(`/api/users/favorites?indicatorId=${encodeURIComponent(indicatorId)}`, {
            method: 'DELETE',
        }).then(async (res) => {
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: "Failed to remove favorite" }));
                throw new Error(errorData.error || 'Server error removing favorite');
            }
            // return res.json(); // If response has data
        }),
        {
            loading: 'Removing from favorites...',
            success: () => {
                // mutateFavorites(); // Optionally revalidate
                return 'Removed from favorites!';
            },
            error: (err) => {
                mutateFavorites(currentFavorites, false); // Revert
                return `Error: ${err.message || 'Could not remove favorite.'}`;
            },
        }
    );
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