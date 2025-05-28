// src/app/admin/apikeys/page.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ApiKeyStatus {
  name: string;
  envVar: string;
  isSet: boolean;
  serviceUrl?: string; // Optional link to the API provider's page
}

// This function would typically run on the server if this were a Server Component,
// or be called from an API route if client-side fetching of status was desired.
// For a simple admin page, reading env vars directly during build/server render is okay.
const getApiKeyStatuses = (): ApiKeyStatus[] => {
  const keysToCheck = [
    { name: "FRED API Key", envVar: "FRED_API_KEY", serviceUrl: "https://fred.stlouisfed.org/docs/api/api_key.html" },
    { name: "Alpha Vantage API Key", envVar: "ALPHA_VANTAGE_API_KEY", serviceUrl: "https://www.alphavantage.co/support/#api-key" },
    { name: "NewsAPI.org Key", envVar: "NEWSAPI_ORG_KEY", serviceUrl: "https://newsapi.org/account" },
    { name: "Finnhub API Key", envVar: "FINNHUB_API_KEY", serviceUrl: "https://finnhub.io/dashboard" },
    { name: "Polygon.io API Key", envVar: "POLYGON_API_KEY", serviceUrl: "https://polygon.io/dashboard/api-keys" },
    { name: "API-Ninjas Key", envVar: "API_NINJAS_KEY", serviceUrl: "https://api-ninjas.com/profile" },
    { name: "Tiingo API Key", envVar: "TIINGO_API_KEY", serviceUrl: "https://www.tiingo.com/account/api/token" },
    { name: "Resend API Key", envVar: "RESEND_API_KEY", serviceUrl: "https://resend.com/api-keys" },
    { name: "Stripe Secret Key", envVar: "STRIPE_SECRET_KEY", serviceUrl: "https://dashboard.stripe.com/apikeys" },
    { name: "Stripe Publishable Key", envVar: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", serviceUrl: "https://dashboard.stripe.com/apikeys" },
    { name: "Stripe Webhook Secret", envVar: "STRIPE_WEBHOOK_SECRET", serviceUrl: "https://dashboard.stripe.com/webhooks" },
    { name: "Google Client ID", envVar: "GOOGLE_CLIENT_ID", serviceUrl: "https://console.developers.google.com/apis/credentials" },
    { name: "Google Client Secret", envVar: "GOOGLE_CLIENT_SECRET", serviceUrl: "https://console.developers.google.com/apis/credentials" },
    { name: "Database URL", envVar: "DATABASE_URL", serviceUrl: "" }, // No direct service URL
    { name: "NextAuth URL", envVar: "NEXTAUTH_URL", serviceUrl: "" },
    { name: "NextAuth Secret", envVar: "NEXTAUTH_SECRET", serviceUrl: "" },
  ];

  return keysToCheck.map(key => ({
    ...key,
    isSet: !!process.env[key.envVar]
  }));
};


export default function AdminApiKeysPage() {
  const apiKeyStatuses = getApiKeyStatuses(); // Fetches status on server render
  const allKeysSet = apiKeyStatuses.every(status => status.isSet);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin">
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Admin Dashboard</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">API Key & Environment Status</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Check</CardTitle>
          <CardDescription>
            Status of essential API keys and environment variables. These are read from the server environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allKeysSet && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Some critical keys/variables are missing. Application functionality may be impaired.</span>
            </div>
          )}
          <ul className="space-y-3">
            {apiKeyStatuses.map(key => (
              <li key={key.envVar} className="flex items-center justify-between p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                <div>
                  <span className="font-medium text-foreground">{key.name}</span>
                  <p className="text-xs text-muted-foreground">
                    (<code>{key.envVar}</code>)
                    {key.serviceUrl && (
                        <a href={key.serviceUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline text-xs">
                           [Manage]
                        </a>
                    )}
                  </p>
                </div>
                {key.isSet ? (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-5 w-5 mr-1.5" />
                    <span className="text-sm font-medium">Set</span>
                  </div>
                ) : (
                  <div className="flex items-center text-destructive">
                    <XCircle className="h-5 w-5 mr-1.5" />
                    <span className="text-sm font-medium">Missing</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}