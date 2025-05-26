// src/app/account/alerts/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, BellRing, Edit3, Loader2, Trash2, BellOff, ArrowLeft, DatabaseZap } from 'lucide-react'; // Added ArrowLeft, DatabaseZap
import { getIndicatorById, IndicatorMetadata } from '@/lib/indicators';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
// import AlertModal from '@/components/dashboard/AlertModal'; // For editing (future)

export interface UserAlert { // Exporting for potential reuse
  id: string;
  userId?: string; // Optional if it's a mock alert not tied to a DB user
  indicatorId: string;
  targetValue: number;
  condition: "ABOVE" | "BELOW";
  isEnabled: boolean;
  createdAt: string; // ISOString
  updatedAt?: string; // ISOString
  triggeredAt?: string | null;
  // For display:
  indicatorName?: string;
  indicatorUnit?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Failed to fetch alerts" }));
    const error = new Error(errorData.error || 'An error occurred while fetching alerts.');
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

const IS_DB_MODE_ACTIVE = !!process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE && process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE === 'true';
// Ensure NEXT_PUBLIC_DATABASE_MODE_ACTIVE is set in your .env.local:
// NEXT_PUBLIC_DATABASE_MODE_ACTIVE=true (or false if DB is not connected)

const getMockAlerts = (userId: string): UserAlert[] => {
    return [
        { id: 'mockalert-1', userId, indicatorId: 'SP500', targetValue: 4800, condition: 'ABOVE', isEnabled: true, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), indicatorName: 'S&P 500 Index', indicatorUnit: 'Index Value' },
        { id: 'mockalert-2', userId, indicatorId: 'UNRATE', targetValue: 4.0, condition: 'BELOW', isEnabled: false, createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), indicatorName: 'Unemployment Rate', indicatorUnit: '%' },
        { id: 'mockalert-3', userId, indicatorId: 'CPI_YOY_PCT', targetValue: 2.5, condition: 'ABOVE', isEnabled: true, createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), triggeredAt: new Date(Date.now() - 86400000 * 1).toISOString(), indicatorName: 'CPI (YoY %)', indicatorUnit: '%' },
    ];
};


export default function ManageAlertsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const userSessionData = session?.user as any;
  const userTier: AppPlanTier | undefined = userSessionData?.activePlanTier;
  const userId = userSessionData?.id;
  const canManageAlerts = canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP);

  const { data: dbAlerts, error: alertsDbError, isLoading: isLoadingDbAlerts, mutate: mutateAlerts } = useSWR<UserAlert[]>(
    sessionStatus === 'authenticated' && canManageAlerts && IS_DB_MODE_ACTIVE ? '/api/users/alerts' : null,
    fetcher
  );

  const [mockAlerts, setMockAlerts] = useState<UserAlert[]>([]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && canManageAlerts && !IS_DB_MODE_ACTIVE && userId) {
        setMockAlerts(getMockAlerts(userId));
    } else {
        setMockAlerts([]);
    }
  }, [sessionStatus, canManageAlerts, userId]);

  const alerts = IS_DB_MODE_ACTIVE ? dbAlerts : mockAlerts;
  const isLoadingAlerts = IS_DB_MODE_ACTIVE ? isLoadingDbAlerts : false; // Mock alerts load instantly
  const alertsError = IS_DB_MODE_ACTIVE ? alertsDbError : null;


  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login?callbackUrl=/account/alerts');
    }
  }, [sessionStatus, router]);

  const enrichedAlerts = React.useMemo(() => {
    return alerts?.map(alert => {
      const indicator = getIndicatorById(alert.indicatorId);
      return {
        ...alert,
        indicatorName: indicator?.name || alert.indicatorId,
        indicatorUnit: indicator?.unit || '',
      };
    }) || [];
  }, [alerts]);

  const toggleAlertEnabled = async (alertId: string, currentIsEnabled: boolean) => {
    if (!IS_DB_MODE_ACTIVE) {
        setMockAlerts(prev => prev.map(a => a.id === alertId ? {...a, isEnabled: !currentIsEnabled, updatedAt: new Date().toISOString()} : a));
        toast.success(`Mock Alert ${!currentIsEnabled ? 'enabled' : 'disabled'}. (No DB Mode)`);
        return;
    }
    setIsProcessing(prev => ({ ...prev, [alertId]: true }));
    toast.loading(currentIsEnabled ? "Disabling alert..." : "Enabling alert...");
    try {
      const response = await fetch('/api/users/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, isEnabled: !currentIsEnabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update alert status.");
      }
      toast.dismiss();
      toast.success(`Alert ${!currentIsEnabled ? 'enabled' : 'disabled'}.`);
      mutateAlerts(); 
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Could not update alert status.");
    } finally {
      setIsProcessing(prev => ({ ...prev, [alertId]: false }));
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!IS_DB_MODE_ACTIVE) {
        setMockAlerts(prev => prev.filter(a => a.id !== alertId));
        toast.success("Mock Alert deleted. (No DB Mode)");
        return;
    }
    if (!window.confirm("Are you sure you want to delete this alert?")) return;
    setIsProcessing(prev => ({ ...prev, [alertId]: true }));
    toast.loading("Deleting alert...");
    try {
      const response = await fetch(`/api/users/alerts?id=${alertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete alert.");
      }
      toast.dismiss();
      toast.success("Alert deleted successfully.");
      mutateAlerts(alerts?.filter(a => a.id !== alertId), false);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Could not delete alert.");
    } finally {
      setIsProcessing(prev => ({ ...prev, [alertId]: false }));
    }
  };

  if (sessionStatus === "loading" || (sessionStatus === 'authenticated' && isLoadingAlerts && !alertsError)) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your alerts...</p>
      </div>
    );
  }

  if (sessionStatus === 'authenticated' && !canManageAlerts) {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col items-center justify-center">
        <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Alerts Not Available</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Managing alerts is a feature available on our Basic and Pro plans.
        </p>
        <div className="flex gap-2">
          <Link href="/pricing"><Button size="lg">Upgrade Your Plan</Button></Link>
          <Link href="/account/profile"><Button size="lg" variant="outline">Back to Profile</Button></Link>
        </div>
      </div>
    );
  }
  
  if (alertsError) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex flex-col items-center justify-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Error Loading Alerts</h2>
            <p className="text-muted-foreground mb-4">{(alertsError as any).message || "Could not load your alerts at this time."}</p>
            <div className="flex gap-2">
                <Button onClick={() => mutateAlerts()}>Try Again</Button>
                <Link href="/account/profile"><Button variant="outline">Back to Profile</Button></Link>
            </div>
        </div>
    );
  }


  return (
    <div className="container mx-auto max-w-4xl py-8 md:py-12 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3">
        <div className="flex items-center gap-3">
            <Link href="/account/profile">
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Profile</span>
                </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Your Alerts</h1>
        </div>
        <Link href="/dashboard">
            <Button variant="outline" size="sm">
                 Explore Indicators to Set New Alerts
            </Button>
        </Link>
      </div>
      {!IS_DB_MODE_ACTIVE && canManageAlerts && (
        <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-base text-yellow-700 dark:text-yellow-300 flex items-center">
                    <DatabaseZap className="h-5 w-5 mr-2" /> Demo Mode: Mock Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-yellow-600 dark:text-yellow-200">
                    Database is not connected. Displaying sample alerts. Changes made here are temporary and will not persist.
                </p>
            </CardContent>
        </Card>
      )}

      {enrichedAlerts && enrichedAlerts.length > 0 ? (
        <div className="space-y-4">
          {enrichedAlerts.map(alert => (
            <Card key={alert.id} className={`transition-opacity ${alert.isEnabled ? 'opacity-100' : 'opacity-60 bg-muted/30'}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{alert.indicatorName}</CardTitle>
                        <CardDescription className="text-xs">
                            Notify when value {alert.condition === "ABOVE" ? "goes above" : "falls below"} {alert.targetValue.toLocaleString()} {alert.indicatorUnit}
                        </CardDescription>
                    </div>
                    <Switch
                        id={`alert-toggle-${alert.id}`}
                        checked={alert.isEnabled}
                        onCheckedChange={() => toggleAlertEnabled(alert.id, alert.isEnabled)}
                        disabled={isProcessing[alert.id]}
                        aria-label={alert.isEnabled ? "Disable alert" : "Enable alert"}
                    />
                </div>
              </CardHeader>
              <CardFooter className="text-xs text-muted-foreground flex justify-between items-center pt-3 border-t">
                <span>
                  Created: {new Date(alert.createdAt).toLocaleDateString()}
                  {alert.triggeredAt && <span className="ml-2 text-green-600">(Last triggered: {new Date(alert.triggeredAt).toLocaleDateString()})</span>}
                </span>
                <div className="flex items-center gap-2">
                  {/* Edit button can be added later if AlertModal is enhanced for editing */}
                  {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { }} disabled={isProcessing[alert.id]}>
                    <Edit3 className="h-4 w-4" /> <span className="sr-only">Edit</span>
                  </Button> */}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => deleteAlert(alert.id)} disabled={isProcessing[alert.id]}>
                    <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-10 min-h-[300px] flex flex-col justify-center items-center">
          <CardHeader>
            <BellRing className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Alerts Set Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You haven't set up any alerts. Visit an indicator's chart to create one.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/dashboard">
              <Button>Explore Indicators</Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}