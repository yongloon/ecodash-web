// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation'; // For redirection
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  // const [password, setPassword] = useState(''); // Password not used for actual auth in this simple version
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username)) {
      router.push('/'); // Redirect to dashboard overview on successful login
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your username to access the dashboard.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input
                id="username"
                type="text"
                placeholder="yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {/* <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div> */}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">Login</Button>
            <p className="text-xs text-center text-muted-foreground">
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