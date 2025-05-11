// src/app/register/page.tsx
"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { signIn } from 'next-auth/react'; // For potential Google sign-up
import { FaGoogle } from 'react-icons/fa';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed.");
      } else {
        setSuccess("Registration successful! Please proceed to login.");
        // Optionally redirect or clear form
        // router.push('/login');
      }
    } catch (err) {
      setError("An unexpected error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    // Google sign-in will handle user creation if they don't exist
    await signIn('google', { callbackUrl: '/' }); 
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>Create your EcoDash account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="space-y-1">
              <label htmlFor="name_reg" className="text-sm font-medium">Full Name (Optional)</label>
              <Input id="name_reg" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <label htmlFor="username_reg" className="text-sm font-medium">Username</label>
              <Input id="username_reg" type="text" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <label htmlFor="email_reg" className="text-sm font-medium">Email</label>
              <Input id="email_reg" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <label htmlFor="password_reg" className="text-sm font-medium">Password</label>
              <Input id="password_reg" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm_password_reg" className="text-sm font-medium">Confirm Password</label>
              <Input id="confirm_password_reg" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Create Account'}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading}>
              <FaGoogle className="mr-2 h-4 w-4" /> Google
            </Button>
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-primary">
                Login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}