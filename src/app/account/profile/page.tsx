// src/app/account/profile/page.tsx
"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator"; // npx shadcn-ui@latest add separator
import { 
    LogOut, Settings, CreditCard, ShieldCheck, AlertTriangle, User as UserIcon, 
    KeyRound, Eye, EyeOff, Loader2, ExternalLinkIcon 
} from 'lucide-react';

// Helper to get initials - more robust
const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) {
    const names = name.trim().split(' ').filter(Boolean); // Filter out empty strings from multiple spaces
    if (names.length === 0) { /* Fallthrough */ }
    else if (names.length === 1) return names[0][0]?.toUpperCase() || "?";
    else return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  }
  if (email) {
    return email[0]?.toUpperCase() || "?";
  }
  return "U"; // Default User
};

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState<string | null>(null);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isPasswordChangeLoading, setIsPasswordChangeLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const userSessionData = session?.user as any;
  const userHasActiveSubscription = userSessionData?.hasActiveSubscription === true;
  const userStripeCustomerId = userSessionData?.stripeCustomerId;
  const activePlanName = userSessionData?.activePlanName;

  // Determine if user likely has a password set locally (i.e., signed up with credentials)
  // This is a heuristic. In a more robust system, you'd store the provider type ('credentials', 'google')
  // with the user record or have it in the session.
  // For now, we check if the user object in the session has an email that's NOT a typical OAuth provider format.
  // Or, more simply, assume they can change if they are logged in. The API will reject if no passwordHash.
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login?callbackUrl=/account/profile');
    }
    if (session) {
        // A simple check: if the session user ID doesn't look like a typical OAuth ID (which are often long strings/numbers)
        // This is VERY crude. A better way is to check the provider used during login,
        // which NextAuth makes available in the `account` object in the `jwt` or `signIn` callbacks.
        // For this example, we'll enable it if they are logged in, and the API will handle if it's an OAuth user.
        // A more direct check would be `userSessionData.provider !== 'google'` if you add provider to session.
        setShowPasswordChangeForm(true); // Assume they can try, API will verify
    }
  }, [status, router, session]);

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
      setPortalError('Failed to open subscription management. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeMessage(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) { // Consistent with registration if you have that rule
      setPasswordChangeError("New password must be at least 6 characters long.");
      return;
    }

    setIsPasswordChangeLoading(true);
    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordChangeError(data.error || "Failed to change password.");
      } else {
        setPasswordChangeMessage(data.message || "Password updated successfully! You may need to log in again with your new password if your session is invalidated.");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        // Consider forcing a re-login for better security after password change
        // signOut({ callbackUrl: '/login?status=passwordChanged' });
      }
    } catch (error) {
      setPasswordChangeError("An unexpected error occurred.");
    } finally {
      setIsPasswordChangeLoading(false);
    }
  };

  if (status === "loading") {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

   // --- CORRECTED SECTION ---
  if (!session?.user) {
    // This case handles when status is "unauthenticated" (after loading) 
    // or if session.user is somehow null even if authenticated (unlikely with NextAuth default flow)
    // The useEffect above should have already redirected if status was "unauthenticated".
    // This is a fallback / explicit state handling.
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
  // --- END CORRECTED SECTION ---

  const { user } = session;

  return (
    <div className="container mx-auto max-w-2xl py-8 md:py-12 px-4">
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="items-center text-center bg-muted/20 p-6 sm:p-8 border-b">
          <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-md">
            <AvatarImage src={user.image || undefined} alt={user.name || user.email || 'User Avatar'} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-semibold">{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl sm:text-3xl font-semibold">{user.name || 'User Profile'}</CardTitle>
          {user.email && <CardDescription className="text-muted-foreground">{user.email}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-8 p-6 sm:p-8">
          
          {/* General Account Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</h3>
            <Link href="/dashboard" className="w-full block">
                <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                    <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Back to Dashboard
                </Button>
            </Link>
          </section>

          <Separator />

          {/* Change Password Section */}
          {showPasswordChangeForm && ( // Conditionally render based on likelihood of having a password
            <section>
              <form onSubmit={handleChangePassword} className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Change Password</h3>
                  {passwordChangeMessage && <p className="text-sm p-3 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700">{passwordChangeMessage}</p>}
                  {passwordChangeError && <p className="text-sm p-3 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-500 border border-red-200 dark:border-red-700">{passwordChangeError}</p>}
                  
                  <div className="space-y-1.5">
                      <Label htmlFor="currentPassword_profile">Current Password</Label>
                      <div className="relative">
                          <Input id="currentPassword_profile" type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" disabled={isPasswordChangeLoading} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrentPassword(s => !s)} aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}>
                              {showCurrentPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                      </div>
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="newPassword_profile">New Password</Label>
                      <div className="relative">
                          <Input id="newPassword_profile" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" disabled={isPasswordChangeLoading} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPassword(s => !s)} aria-label={showNewPassword ? "Hide new password" : "Show new password"}>
                              {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                      </div>
                  </div>
                  <div className="space-y-1.5">
                      <Label htmlFor="confirmNewPassword_profile">Confirm New Password</Label>
                      <div className="relative">
                          <Input id="confirmNewPassword_profile" type={showConfirmNewPassword ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" disabled={isPasswordChangeLoading} />
                           <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmNewPassword(s => !s)} aria-label={showConfirmNewPassword ? "Hide confirm new password" : "Show confirm new password"}>
                              {showConfirmNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                          </Button>
                      </div>
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isPasswordChangeLoading}>
                      {isPasswordChangeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
                      {isPasswordChangeLoading ? "Updating..." : "Update Password"}
                  </Button>
              </form>
            </section>
          )}
          {!showPasswordChangeForm && user?.email && ( // If form is hidden, and user has an email (likely OAuth user)
            <section className="border-t pt-6">
                 <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Password</h3>
                 <p className="text-sm text-muted-foreground">
                    You are signed in with an external provider (e.g., Google). To manage your password, please visit your provider's account settings.
                 </p>
            </section>
          )}


          <Separator />

          {/* Subscription Management Section */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Subscription</h3>
            {portalError && (
                <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive text-sm rounded-md flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0"/> {portalError}
                </div>
            )}
            {userStripeCustomerId ? (
                <>
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
                        {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4" />}
                        {isPortalLoading ? "Loading Portal..." : "Manage Billing & Subscription"}
                        <ExternalLinkIcon className="ml-auto h-4 w-4 opacity-70"/>
                    </Button>
                    {!userHasActiveSubscription && (
                         <Link href="/pricing" className="w-full block">
                            <Button variant="outline" className="w-full justify-start text-foreground hover:bg-muted/50">
                                View Subscription Plans
                            </Button>
                        </Link>
                    )}
                </>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Upgrade to unlock advanced features and full data access.</p>
                    <Link href="/pricing" className="w-full sm:w-auto">
                        <Button className="w-full sm:w-auto">View Subscription Plans</Button>
                    </Link>
                </div>
            )}
          </section>

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