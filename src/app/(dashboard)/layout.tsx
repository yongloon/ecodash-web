// src/app/(dashboard)/layout.tsx (or src/app/layout.tsx if it's your main layout with the footer)
"use client"; // Keep if you have client-side logic in this layout

import React, { useState, useEffect } from 'react';
import SidebarNav from '@/components/dashboard/SidebarNav';
import Header from '@/components/dashboard/Header';
import { usePathname } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button'; // If used in footer for styling links
import { Github, Linkedin, Twitter } from 'lucide-react'; // Import social icons

export default function DashboardLayout({ // Or RootLayout
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
  }, [pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Replace with your actual social media URLs
  const socialLinks = {
    twitter: "https://twitter.com/YourEcoDash",
    linkedin: "https://linkedin.com/company/YourEcoDash",
    github: "https://github.com/YourUser/EcoDashProject",
  };

  return (
    <div className="flex h-screen bg-background font-sans text-foreground"> {/* Changed from bg-muted/30 */}
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
        {/* Footer Section */}
        <footer className="py-4 px-6 text-center text-xs text-muted-foreground border-t bg-card">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>
              © {new Date().getFullYear()} EcoDash. All data is for informational purposes only. Not financial advice.
              <Link href="/terms" className="ml-2 hover:underline">Terms</Link> |
              <Link href="/privacy" className="ml-1 hover:underline">Privacy</Link>
            </div>
            <div className="flex items-center space-x-3 mt-2 sm:mt-0">
              <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="EcoDash on Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" aria-label="EcoDash on LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" aria-label="EcoDash on GitHub" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}