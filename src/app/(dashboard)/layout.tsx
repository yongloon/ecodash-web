// src/app/(dashboard)/layout.tsx
"use client"; // Important: If Header or Sidebar use client hooks, this might need to be client

import React from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
// If you were doing auth checks here, ensure useSession is used correctly.
// For now, assuming dashboard is public and Header handles auth display.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No client-side auth redirection here to keep dashboard public if desired
  // Auth status is checked in Header for UI changes

  return (
    <div className="flex h-screen bg-muted/40 dark:bg-background font-sans text-foreground">
      <SidebarNav /> {/* Sidebar component */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header /> {/* Header component */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {children} {/* This is where your dashboard pages will render */}
        </main>
      </div>
    </div>
  );
}