// src/app/(dashboard)/layout.tsx
"use client";

import React from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
// Remove useAuth and useRouter if no longer doing client-side redirect here
// import { useAuth } from '@/context/AuthContext';
// import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { currentUser, isLoading } = useAuth(); // No longer needed for basic view
  // const router = useRouter();

  // useEffect(() => { // REMOVE OR COMMENT OUT THIS BLOCK
  //   if (!isLoading && !currentUser) {
  //     router.replace('/login');
  //   }
  // }, [currentUser, isLoading, router]);

  // if (isLoading) { // Can keep a general loading state if desired, but not auth-gated
  //   return (
  //       <div className="flex items-center justify-center h-screen bg-background">
  //           <p className="text-muted-foreground">Loading dashboard...</p>
  //       </div>
  //   );
  // }

  // The dashboard is now publicly accessible
  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header /> {/* Header will show Login/User Info based on session */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/40 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}