// src/app/(dashboard)/layout.tsx
"use client"; // MUST BE A CLIENT COMPONENT TO USE HOOKS

import React, { useEffect } from 'react'; // Added useEffect
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
import { useAuth } from '@/context/AuthContext';    // IMPORT useAuth
import { useRouter } from 'next/navigation';   // IMPORT useRouter

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login'); // Redirect to login if not authenticated and not loading
    }
  }, [currentUser, isLoading, router]);

  // Show a loading state or null while checking auth, or just render children if confident in flow
  if (isLoading) {
    return ( // Optional: Basic loading state for the whole dashboard layout
        <div className="flex items-center justify-center h-screen bg-background">
            <p className="text-muted-foreground">Loading dashboard...</p>
            {/* You could put a spinner here */}
        </div>
    );
  }
  
  // If user is not logged in (and not loading anymore), they would have been redirected.
  // So if we reach here and there's no user, it might be a brief moment before redirect.
  // Or, if there IS a user, render the dashboard.
  if (!currentUser) {
      // This state should ideally not be reached for long due to the redirect.
      // Can show a more specific "Redirecting to login..." or just null.
      return null; 
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans"> {/* Use theme variables */}
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/40 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}