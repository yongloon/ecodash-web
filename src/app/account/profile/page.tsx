// src/app/account/profile/page.tsx
"use client";

import React from 'react'; // Removed useState, useEffect, FormEvent
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Input } from "@/components/ui/input"; // Not needed
// import { Label } from "@/components/ui/label"; // Not needed
// import { Separator } from "@/components/ui/separator"; // Not needed
import { LogOut, Settings, User as UserIcon, Loader2 } from 'lucide-react'; // Removed other icons

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length === 0) { /* Fallthrough */ }
    else if (names.length === 1) return names[0][0]?.toUpperCase() || "?";
    else return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() || "?";
  return "U";
};

export default function ProfilePageMVP() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // No password change or Stripe state needed for MVP

  React.useEffect(() => { // Keep this effect for auth check
    if (status === "unauthenticated") {
      router.replace('/login?callbackUrl=/account/profile');
    }
  }, [status, router]);

  if (status === "loading") {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!session?.user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
             <Card className="w-full max-w-sm p-6 text-center">
                <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2 text-xl">Access Denied</CardTitle>
                <CardDescription className="mb-4 text-sm">
                    You need to be logged in to view your profile.
                </CardDescription>
                <Button asChild>
                    <Link href={`/login?callbackUrl=${encodeURIComponent('/account/profile')}`}>
                        Go to Login
                    </Link>
                </Button>
            </Card>
        </div>
    );
  }

  const { user } = session;

  return (
    <div className="container mx-auto max-w-lg py-8 md:py-12 px-4"> {/* Simplified max-width */}
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="items-center text-center bg-muted/20 p-6 sm:p-8 border-b">
          <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-md">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email || 'User Avatar'} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-semibold">{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl sm:text-3xl font-semibold">{user.name || 'User Profile'}</CardTitle>
          {user.email && <CardDescription className="text-muted-foreground">{user.email}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-6 p-6 sm:p-8"> {/* Simplified space */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h3>
            <Link href="/dashboard" className="w-full block">
                <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Back to Dashboard
                </Button>
            </Link>
          </section>
          {/* Password Change Section Removed */}
          {/* Subscription Management Section Removed */}
        </CardContent>
        <CardFooter className="border-t p-6 sm:p-8 bg-muted/20">
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}