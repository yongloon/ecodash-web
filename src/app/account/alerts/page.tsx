// src/app/account/alerts/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, BellRing, Edit3, Loader2, Trash2, BellOff } from 'lucide-react';
import { getIndicatorById, IndicatorMetadata } from '@/lib/indicators';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
import AlertModal from '@/components/dashboard/AlertModal'; // For editing

interface UserAlert {
  id: string;
  indicatorId: string;
  targetValue: number;
  condition: "ABOVE" | "BELOW";
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
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

export default function ManageAlertsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  const canManageAlerts = canUserAccessFeature(userTier, FEATURE_KEYS.ALERTS_BASIC_SETUP);

  const { data: alerts, error: alertsError, isLoading: isLoadingAlerts, mutate: mutateAlerts } = useSWR<UserAlert[]>(
    sessionStatus === 'authenticated' && canManageAlerts ? '/api/users/alerts' : null,
    fetcher
  );

  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  // For editing - though AlertModal is for creation, we might adapt or create an EditAlertModal
  // const [editingAlert, setEditingAlert] = useState<UserAlert | null>(null);
  // const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

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
      mutateAlerts(); // Revalidate SWR cache
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Could not update alert status.");
    } finally {
      setIsProcessing(prev => ({ ...prev, [alertId]: false }));
    }
  };

  const deleteAlert = async (alertId: string) => {
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
      mutateAlerts(alerts?.filter(a => a.id !== alertId), false); // Optimistic update
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || "Could not delete alert.");
    } finally {
      setIsProcessing(prev => ({ ...prev, [alertId]: false }));
    }
  };

  if (sessionStatus === "loading" || (sessionStatus === 'authenticated' && isLoadingAlerts && !alertsError)) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your alerts...</p>
      </div>
    );
  }

  if (sessionStatus === 'authenticated' && !canManageAlerts) {
    return (
      <div className="container mx-auto p-8 text-center min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center">
        <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Alerts Not Available</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Managing alerts is a feature available on our Basic and Pro plans.
        </p>
        <div className="flex gap-2">
          <Link href="/pricing"><Button size="lg">Upgrade Your Plan</Button></Link>
          <Link href="/dashboard"><Button size="lg" variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }
  
  if (alertsError) {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive">Error Loading Alerts</h2>
            <p className="text-muted-foreground mb-4">{(alertsError as any).message || "Could not load your alerts at this time."}</p>
            <Button onClick={() => mutateAlerts()}>Try Again</Button>
        </div>
    );
  }


  return (
    <div className="container mx-auto max-w-4xl py-8 md:py-12 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Manage Your Alerts</h1>
        <Link href="/dashboard">
            <Button variant="outline">
                 Explore Indicators to Set New Alerts
            </Button>
        </Link>
      </div>

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
                  {/* <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAlert(alert); setIsAlertModalOpen(true);}} disabled={isProcessing[alert.id]}>
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
        <Card className="text-center py-10">
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
      {/* Placeholder for Edit Modal if implemented - currently AlertModal is for creation */}
      {/* {editingAlert && isAlertModalOpen && (
        <AlertModal
          isOpen={isAlertModalOpen}
          onOpenChange={setIsAlertModalOpen}
          indicator={getIndicatorById(editingAlert.indicatorId)!} // Assuming getIndicatorById is safe here
          currentValue={null} // Or fetch current value if needed for edit context
          onAlertCreated={() => { mutateAlerts(); setEditingAlert(null); }} // Adapt for update
          existingAlert={editingAlert} // Pass existing alert data
        />
      )} */}
    </div>
  );
}