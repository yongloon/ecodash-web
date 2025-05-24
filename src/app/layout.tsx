// File: src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { NextAuthProvider } from "@/context/NextAuthProvider";
import BetaWelcomeBanner from '@/components/BetaWelcomeBanner';
import { Toaster } from 'react-hot-toast'; // <<< ADD THIS
import NoDbModeBanner from '@/components/NoDbModeBanner'; // <<< ADD THIS

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EcoDash - Economic Indicators Dashboard",
  description: "Track key economic indicators and gain insights into market trends.",
};

// Wrapper to conditionally render NoDbModeBanner based on server-side env var
const NoDbModeBannerWrapper = () => {
  const isDbModeActive = !!process.env.DATABASE_URL;
  return <NoDbModeBanner isActive={!isDbModeActive} />;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <NextAuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={100}>
               <Toaster position="bottom-right" reverseOrder={false} /> {/* <<< ADD THIS */}
               {children}
               <BetaWelcomeBanner />
               <NoDbModeBannerWrapper /> {/* <<< ADD THIS */}
            </TooltipProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}