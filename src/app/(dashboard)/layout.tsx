// File: src/app/(dashboard)/layout.tsx
// src/app/(dashboard)/layout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
            onClick={() => {
                if (isMobileMenuOpen) setIsMobileMenuOpen(false);
            }}
        >
          {children}
        </main>
        <footer className="text-center text-xs text-muted-foreground p-3 border-t bg-card flex-shrink-0">
          © {new Date().getFullYear()} EcoDash. All data for informational purposes only. Not financial advice.
          <Link href="/terms" className="ml-2 hover:underline">Terms</Link> |
          <Link href="/privacy" className="ml-1 hover:underline">Privacy</Link>
        </footer>
      </div>
    </div>
  );
}