// src/app/reset-password/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import toast from 'react-hot-toast'; // <<< ADD THIS

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // const [message, setMessage] = useState<string | null>(null); // Handled by toast
  // const [error, setError] = useState<string | null>(null); // Handled by toast
  const [isLoading, setIsLoading] = useState(false);
  const [isValidTokenState, setIsValidTokenState] = useState<boolean | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);


  useEffect(() => {
    if (!token) {
      toast.error("No reset token provided or token is invalid.");
      setIsValidTokenState(false);
      return;
    }
    setIsValidTokenState(true);
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    // setMessage(null); // Handled by toast
    // setError(null); // Handled by toast

    try {
      const response = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to reset password.");
      } else {
        toast.success(data.message || "Password has been reset successfully. You can now login.");
        setShowSuccessMessage(true); // To show the "Back to Login" button after success
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch (err) {
      toast.error("An unexpected error occurred during password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidTokenState === false) {
    return (
         <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-sm">
                <CardHeader><CardTitle>Invalid Link</CardTitle></CardHeader>
                <CardContent><p className="text-destructive">This password reset link is invalid or has expired.</p></CardContent>
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
            {/* Error/Success messages handled by toast */}
            <div className="space-y-2">
              <label htmlFor="new_password_reset" className="text-sm font-medium">New Password</label>
              <Input
                id="new_password_reset"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || showSuccessMessage}
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
                disabled={isLoading || showSuccessMessage}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || showSuccessMessage}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </CardFooter>
        </form>
         {showSuccessMessage && (
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