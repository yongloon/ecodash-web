// src/app/login/page.tsx
"use client";
import React, { useState } from 'react';
import { signIn } from 'next-auth/react'; // Use signIn from next-auth
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { FaGoogle } from 'react-icons/fa'; // For Google button

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
        redirect: false, // Handle redirect manually
        email,
        password,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password." : result.error);
      } else if (result?.ok) {
        router.push('/'); // Redirect to dashboard
        router.refresh(); // Important to refresh server session state
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl: '/' }); // Redirect to dashboard after Google sign-in
    // setIsLoading(false); // Page will redirect, so this might not be hit
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <label htmlFor="email_login" className="text-sm font-medium">Email</label>
              <Input
                id="email_login" // Unique ID
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password_login" className="text-sm font-medium">Password</label>
              <Input
                id="password_login" // Unique ID
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
             <div className="text-right">
                <Link href="/forgot-password" // Link to forgot password page
                    className="text-xs text-muted-foreground hover:text-primary underline">
                    Forgot password?
                </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="relative w-full">
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