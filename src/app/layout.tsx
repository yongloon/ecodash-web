// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { NextAuthProvider } from "@/context/NextAuthProvider"; // RENAMED for clarity or create this file

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { /* ... */ };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <NextAuthProvider> {/* WRAP with NextAuthProvider */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
               {children}
            </TooltipProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}