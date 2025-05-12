// src/app/reset-password/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null); // null: checking, true: valid, false: invalid

  // Optional: Validate token on load (can also be done purely on submit)
  useEffect(() => {
    if (!token) {
      setError("No reset token provided or token is invalid.");
      setIsValidToken(false);
      return;
    }
    // You could add an API route to verify token validity without resetting
    // For now, we'll just assume it's potentially valid until submission.
    setIsValidToken(true); // Assume valid for now, server will confirm
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setMessage(data.message || "Password has been reset successfully. You can now login.");
        // Optionally redirect to login after a delay
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === false) { // If token was determined invalid on load
    return (
         <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader><CardTitle>Invalid Link</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">{error || "This password reset link is invalid or has expired."}</p></CardContent>
                <CardFooter>
                    <Link href="/forgot-password">
                        <Button variant="link">Request a new link</Button>
                    </Link>
                </CardFooter>
            </Card>
         </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-green-600">{message}</p>}
            <div className="space-y-2">
              <label htmlFor="new_password_reset" className="text-sm font-medium">New Password</label>
              <Input
                id="new_password_reset"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || !!message} // Disable if success message shown
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm_new_password_reset" className="text-sm font-medium">Confirm New Password</label>
              <Input
                id="confirm_new_password_reset"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || !!message}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || !!message}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </CardFooter>
        </form>
         {message && (
            <div className="p-4 text-center">
                <Link href="/login">
                    <Button variant="outline">Back to Login</Button>
                </Link>
            </div>
        )}
      </Card>
    </div>
  );
}