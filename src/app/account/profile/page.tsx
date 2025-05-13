// src/app/account/profile/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, CreditCard, ShieldCheck, AlertTriangle, User as UserIcon } from 'lucide-react'; // Added UserIcon
import Link from 'next/link';

const getInitials = (name?: string | null) => {
  if (!name) return "U";
  const names = name.trim().split(' ');
  if (names.length === 0 || names[0] === "") return "U";
  if (names.length === 1) return names[0][0]?.toUpperCase() || "U";
  return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const userSessionData = session?.user as any; // Cast to access custom properties
  const userHasActiveSubscription = userSessionData?.hasActiveSubscription === true;
  const userStripeCustomerId = userSessionData?.stripeCustomerId;
  const activePlanName = userSessionData?.activePlanName;


  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login?callbackUrl=/account/profile');
    }
  }, [status, router]);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    setPortalError(null);
    try {
      const response = await fetch('/api/stripe/create-portal-link', { method: 'POST' });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || 'Could not open subscription management.');
      }
    } catch (error) {
      console.error("Portal link fetch error:", error);
      setPortalError('Failed to open subscription management. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (status === "loading") {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <p className="text-muted-foreground">Loading profile...</p>
        </div>
    );
  }

  if (!session?.user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <Card className="w-full max-w-sm p-6 text-center">
                <UserIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">Access Denied</CardTitle>
                <CardDescription className="mb-4">
                    Please <Link href="/login?callbackUrl=/account/profile" className="underline text-primary hover:text-primary/80">login</Link> to view your profile.
                </CardDescription>
            </Card>
        </div>
    );
  }

  const { user } = session;

  return (
    <div className="container mx-auto max-w-2xl py-8 md:py-12 px-4">
      <Card className="overflow-hidden">
        <CardHeader className="items-center text-center bg-muted/30 p-6 sm:p-8">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mb-4 border-4 border-background shadow-lg">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email || 'User Avatar'} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl sm:text-2xl">{user.name || 'User Profile'}</CardTitle>
          {user.email && <CardDescription>{user.email}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6 p-6 sm:p-8">
          {portalError && (
            <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0"/> {portalError}
            </div>
          )}
          
          <div className="space-y-3">
            <h3 className="text-md font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
            <Link href="/dashboard" className="w-full block">
                <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Back to Dashboard
                </Button>
            </Link>
            {/* TODO: Add link to change password page if user used Credentials provider */}
            {/* <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" /> Change Password
            </Button> */}
          </div>

          {userStripeCustomerId ? (
            <div className="space-y-3">
                <h3 className="text-md font-semibold text-muted-foreground uppercase tracking-wider">Subscription</h3>
                {userHasActiveSubscription ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-sm rounded-md flex items-center">
                        <ShieldCheck className="mr-2 h-4 w-4 flex-shrink-0" /> 
                        Active Plan: <span className="font-semibold ml-1">{activePlanName || 'Subscribed'}</span>
                    </div>
                ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm rounded-md flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" /> No active subscription found.
                    </div>
                )}
                <Button onClick={handleManageSubscription} disabled={isPortalLoading} className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {isPortalLoading ? "Loading Portal..." : "Manage Billing & Subscription"}
                </Button>
                {!userHasActiveSubscription && (
                     <Link href="/pricing" className="w-full block">
                        <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                            View Plans
                        </Button>
                    </Link>
                )}
            </div>
          ) : (
            <div className="space-y-3 text-center border-t pt-6">
                <h3 className="text-md font-semibold text-muted-foreground uppercase tracking-wider mb-2">Get More Insights</h3>
                <p className="text-sm text-muted-foreground mb-3">Upgrade to unlock advanced features and full data access.</p>
                <Link href="/pricing" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">View Subscription Plans</Button>
                </Link>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t p-6 sm:p-8">
          <Button variant="ghost" onClick={() => signOut({ callbackUrl: '/login' })} className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}