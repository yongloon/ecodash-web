// File: src/app/(dashboard)/layout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';
import WhatsNewModal from '@/components/WhatsNewModal';
// Removed `import { useTranslations } from 'next-intl';` as we are removing i18n for now

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [isWhatsNewModalOpen, setIsWhatsNewModalOpen] = useState(false);
  // const tFooter = useTranslations('DashboardLayout'); // Removed
  // const tHeader = useTranslations('Header'); // Removed

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
    <div className="flex h-screen bg-muted dark:bg-background font-sans text-foreground">
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
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex-grow text-left sm:text-center"> 
              © {new Date().getFullYear()} EcoDash. All data for informational purposes only. Not financial advice.
              <Link href="/terms" className="ml-2 hover:underline">Terms</Link> |
              <Link href="/privacy" className="ml-1 hover:underline">Privacy</Link>
            </div>
            <div className="flex items-center space-x-3 mt-2 sm:mt-0 flex-shrink-0">
              <button 
                onClick={() => setIsWhatsNewModalOpen(true)} 
                className="text-xs text-primary hover:underline"
              >
                What's New? 
              </button>
              <a href="https://twitter.com/yourprofile" target="_blank" rel="noopener noreferrer" aria-label="EcoDash on Twitter" className="hover:text-primary transition-colors">
                <FaTwitter className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com/company/yourcompany" target="_blank" rel="noopener noreferrer" aria-label="EcoDash on LinkedIn" className="hover:text-primary transition-colors">
                <FaLinkedin className="h-4 w-4" />
              </a>
              <a href="https://github.com/yourrepo" target="_blank" rel="noopener noreferrer" aria-label="EcoDash on GitHub" className="hover:text-primary transition-colors">
                <FaGithub className="h-4 w-4" />
              </a>
            </div>
          </div>
        </footer>
      </div>
      <WhatsNewModal isOpen={isWhatsNewModalOpen} onOpenChange={setIsWhatsNewModalOpen} />
    </div>
  );
}