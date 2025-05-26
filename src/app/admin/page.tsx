// src/app/admin/page.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, Settings, BarChart2 } from 'lucide-react';
import prisma from '@/lib/prisma'; // For potential DB interaction
    
export default async function AdminDashboardPage() {
  let userCount = 'N/A';
  if (prisma) {
    try {
      const count = await prisma.user.count();
      userCount = count.toLocaleString();
    } catch (e) {
      console.error("Admin dashboard: Failed to fetch user count", e);
      userCount = "Error";
    }
  } else {
    userCount = "3 (Demo)"; // Mock count for No DB mode
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
            <div className="text-2xl font-bold">{userCount}</div>
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
    </div>
  );
}