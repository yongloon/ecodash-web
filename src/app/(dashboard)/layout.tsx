// src/app/(dashboard)/layout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
import { usePathname } from 'next/navigation'; // Import usePathname

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname(); // Get current path

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Dependency on pathname

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-muted/30 dark:bg-background font-sans text-foreground">
      <SidebarNav isMobileMenuOpen={isMobileMenuOpen} toggleMobileMenu={toggleMobileMenu} />
      
      <div className="flex-1 flex flex-col overflow-hidden"> 
        <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
        <main 
            className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8"
            onClick={() => { // Close menu if clicking on main content area on mobile
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}