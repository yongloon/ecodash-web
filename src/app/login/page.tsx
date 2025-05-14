// src/app/login/page.tsx
"use client"; // ESSENTIAL FIRST LINE

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // Check this path
import { Input } from '@/components/ui/input';   // Check this path
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Check this path
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      console.log("[LoginPage] Credentials sign-in result:", result); // For debugging

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : "Login failed. Please try again.");
      } else if (result?.ok && !result.error) { // Check for !result.error explicitly
        // Successful login, NextAuth usually handles redirect via callbackUrl if set
        // If not, or if redirect:false, we push manually.
        // The callbackUrl for credentials provider is often handled by NextAuth itself based on where user came from
        // or defaults. Pushing here might be redundant or override NextAuth's intended flow.
        // For now, let's assume successful result means we want to go to dashboard.
        router.push('/'); // Or simply '/' if that's your overview
        router.refresh(); // Good practice to refresh server session state if needed
      } else if (!result?.ok) {
        setError("Login attempt failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error("[LoginPage] Credentials sign-in catch error:", err);
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    // signIn with 'google' will redirect to Google, then back to callbackUrl
    // The callbackUrl should ideally be handled by NextAuth configuration
    // or if specified here, ensure it's a valid page to return to.
    signIn('google', { callbackUrl: '/dashboard' }).catch(err => { // Or '/'
        console.error("[LoginPage] Google sign-in error:", err);
        setError("Failed to initiate Google Sign-In.");
        setIsLoading(false);
    });
    // setIsLoading(false) might not be reached if redirect is successful
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Access your Economic Dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCredentialsLogin}>
          <CardContent className="space-y-4">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
            <div className="space-y-2">
              <label htmlFor="email_login_page" className="text-sm font-medium">Email</label> {/* Unique ID */}
              <Input
                id="email_login_page"
                type="email"
                autoComplete="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password_login_page" className="text-sm font-medium">Password</label> {/* Unique ID */}
              <Input
                id="password_login_page"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <div className="text-right">
                <Link href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary underline">
                    Forgot password?
                </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && !email.includes("google") ? 'Logging in...' : 'Login with Email'}
            </Button>
            <div className="relative w-full my-2"> {/* Added margin */}
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
              <FaGoogle className="mr-2 h-4 w-4" /> Google
            </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="underline hover:text-primary">
                Register here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}