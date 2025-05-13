// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Ensure your globals.css has theme variables
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider"; // Your custom theme provider
import { NextAuthProvider } from "@/context/NextAuthProvider"; // NextAuth SessionProvider wrapper

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" }); // Added variable for Tailwind

export const metadata: Metadata = {
  title: "EcoDash - Economic Indicators Dashboard",
  description: "Track key economic indicators and gain insights into market trends.",
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
            <TooltipProvider delayDuration={100}> {/* Sensible default delay */}
               {children}
            </TooltipProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}