// src/app/admin/settings/page.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
            <Link href="/admin">
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to Admin Dashboard</span>
                </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Site Settings</h1>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Application Configuration</CardTitle>
          <CardDescription>
            Manage global settings for EcoDash. (This is a placeholder page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Future settings could include:
          </p>
          <ul className="list-disc list-inside text-muted-foreground text-sm mt-2 space-y-1">
            <li>API Key Management (display status, not keys themselves)</li>
            <li>Feature Flag Toggles</li>
            <li>Maintenance Mode Activation</li>
            <li>Default application behaviors</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}