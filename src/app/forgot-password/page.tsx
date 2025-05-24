// src/app/forgot-password/page.tsx
"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import toast from 'react-hot-toast'; // <<< ADD THIS

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  // const [message, setMessage] = useState<string | null>(null); // Handled by toast
  // const [error, setError] = useState<string | null>(null); // Handled by toast
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // setMessage(null); // Handled by toast
    // setError(null); // Handled by toast

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to request password reset.");
      } else {
        toast.success(data.message); // "If an account with this email exists..."
      }
    } catch (err) {
      toast.error("An unexpected error occurred requesting password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error/Success messages handled by toast */}
            <div className="space-y-2">
              <label htmlFor="email_forgot" className="text-sm font-medium">Email</label>
              <Input
                id="email_forgot"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}