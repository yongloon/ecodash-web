// src/app/admin/layout.tsx
"use client";

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, LayoutDashboard, Users, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserRole } from '@/app/api/auth/[...nextauth]/route'; // Import UserRole

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; 
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/admin');
      return;
    }
    // Explicitly cast session.user to include 'role'
    const userRole = (session?.user as { role?: UserRole })?.role;
    if (session && userRole !== 'ADMIN') {
      router.replace('/dashboard?error=unauthorized_admin');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const userRole = (session?.user as { role?: UserRole })?.role;
  if (status === 'authenticated' && userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Link href="/dashboard" className="mt-4">
          <Button variant="outline">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }
  
  if (!session) { 
      return null; 
  }

  return (
    <div className="flex h-screen bg-muted/40 dark:bg-background">
      <aside className="w-60 bg-card border-r border-border/60 p-4 flex flex-col space-y-2">
        <Link href="/" className="flex items-center gap-2 mb-4 group pl-2">
            <BarChart3 className="h-7 w-7 text-primary group-hover:opacity-80 transition-opacity" />
            <span className="text-lg font-semibold text-primary">EcoDash</span>
        </Link>
        <h2 className="text-sm font-semibold text-muted-foreground px-2">Admin Panel</h2>
        <Separator />
        <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
        </Link>
        <Link href="/admin/users">
             <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" /> Users
            </Button>
        </Link>
        <Link href="/admin/settings">
            <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" /> Site Settings
            </Button>
        </Link>
        <Separator className="my-4" />
        <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start">
                ← Back to Main Dashboard
            </Button>
        </Link>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card h-16 flex items-center px-6 border-b border-border/60">
          <h1 className="text-xl font-semibold text-foreground">Administration</h1>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}