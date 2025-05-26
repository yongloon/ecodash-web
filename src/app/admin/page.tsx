// src/app/admin/page.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Settings, BarChart2, CreditCard, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import prisma from '@/lib/prisma'; 
import { APP_PLANS } from '@/app/api/auth/[...nextauth]/route';

export default async function AdminDashboardPage() {
  let userCount = 'N/A';
  let userCountError = false;
  if (prisma) {
    try {
      const count = await prisma.user.count();
      userCount = count.toLocaleString();
    } catch (e) {
      console.error("Admin dashboard: Failed to fetch user count", e);
      userCount = "Error";
      userCountError = true;
    }
  } else {
    userCount = "3 (Demo)"; // Mock count for No DB mode
  }

  let activeSubscriptions = { free: 0, basic: 0, pro: 0, totalActivePaid: 0 };
  let subscriptionError = false;

  if (prisma) {
    try {
      const usersWithSubs = await prisma.user.findMany({
        where: { 
          stripeSubscriptionId: { not: null }, 
          stripeCurrentPeriodEnd: { gt: new Date() } 
        },
        select: { stripePriceId: true },
      });
      usersWithSubs.forEach(user => {
        if (user.stripePriceId === APP_PLANS.BASIC.priceId) activeSubscriptions.basic++;
        else if (user.stripePriceId === APP_PLANS.PRO.priceId) activeSubscriptions.pro++;
      });
      activeSubscriptions.totalActivePaid = activeSubscriptions.basic + activeSubscriptions.pro;
      // Note: Calculating free users accurately would require knowing total users and subtracting paid,
      // or querying for users with NO active subscription. For simplicity, just showing paid counts.
    } catch (e) {
      console.error("Admin dashboard: Failed to fetch subscription counts", e);
      subscriptionError = true;
    }
  } else { // Mock data for subscriptions in No DB Mode
    activeSubscriptions = { free: 1, basic: 1, pro: 1, totalActivePaid: 2 };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${userCountError ? 'text-destructive' : ''}`}>{userCount}</div>
            {!prisma && <p className="text-xs text-yellow-600 dark:text-yellow-400"> (Demo Mode)</p>}
            <p className="text-xs text-muted-foreground">
              Manage all registered users.
            </p>
            <Link href="/admin/users" className="text-sm text-primary hover:underline mt-2 block">
              View Users →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {subscriptionError && prisma ? ( // Only show DB error if prisma was supposed to be used
              <div className="text-destructive">Error loading subs</div>
            ) : (
              <div className="text-2xl font-bold">{activeSubscriptions.totalActivePaid.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Paid</span></div>
            )}
            <p className="text-xs text-muted-foreground">
              Basic: {activeSubscriptions.basic}, Pro: {activeSubscriptions.pro}
            </p>
            {!prisma && <p className="text-xs text-yellow-600 dark:text-yellow-400">(Demo Mode)</p>}
            {/* Placeholder for link to a subscriptions management page if you build one */}
            {/* <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline mt-2 block">
              Manage Subscriptions →
            </Link> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Settings</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configuration</div>
            <p className="text-xs text-muted-foreground">
              Manage global site configurations.
            </p>
             <Link href="/admin/settings" className="text-sm text-primary hover:underline mt-2 block">
              Go to Settings →
            </Link>
          </CardContent>
        </Card>

        {/* This card can be removed or replaced if not needed, or if Analytics is a future feature */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics (Placeholder)</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Site Traffic</div>
            <p className="text-xs text-muted-foreground">
              View key metrics and site usage.
            </p>
            <p className="text-sm text-muted-foreground mt-2">Coming Soon</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="mr-2 h-5 w-5" /> Recent Site Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!prisma && <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2">(Displaying mock activity as database is not connected)</p>}
            <ul className="space-y-2 text-sm text-muted-foreground max-h-60 overflow-y-auto">
              <li className="border-b pb-1 pt-1">User 'demouser1@example.com' registered. (Mock) - 2 hours ago</li>
              <li className="border-b pb-1 pt-1">Subscription 'sub_demobasic' started for 'basic@example.com'. (Mock) - 1 day ago</li>
              <li className="border-b pb-1 pt-1">Admin 'admin@example.com' logged in. (Mock) - 5 minutes ago</li>
              <li className="border-b pb-1 pt-1">Password reset requested for 'user@example.com'. (Mock) - 30 minutes ago</li>
              <li className="border-b pb-1 pt-1">Indicator 'SP500' favorited by 'demouser1'. (Mock) - 1 hour ago</li>
            </ul>
            {prisma && <p className="text-muted-foreground mt-4">Actual activity logging not yet implemented.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" disabled>
                Trigger Site Rebuild (Soon)
            </Button>
            <Button variant="outline" disabled>
                Clear Application Cache (Soon)
            </Button>
            <Button variant="outline" disabled>
                Send System Announcement (Soon)
            </Button>
            <Button variant="outline" disabled>
                View System Logs (Soon)
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Admin Panel v0.1.1
      </div>
    </div>
  );
}