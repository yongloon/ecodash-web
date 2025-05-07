import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Import the font
import "./globals.css"; // Import global styles
import { TooltipProvider } from "@/components/ui/tooltip"; // Import TooltipProvider if using Shadcn

// Initialize the font
const inter = Inter({ subsets: ["latin"] });

// Define metadata for the application
export const metadata: Metadata = {
  title: "Economic Indicators Dashboard",
  description: "Track key economic indicators",
};

// Root layout component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Add suppressHydrationWarning for theme/dark mode */}
      <body className={`${inter.className} antialiased`}> {/* Apply font class and antialiasing */}
        {/* Wrap children with TooltipProvider if using Shadcn Tooltips */}
        <TooltipProvider>
           {children}
        </TooltipProvider>
        {/* You might add a ThemeProvider here if implementing dark mode toggle */}
      </body>
    </html>
  );
}
