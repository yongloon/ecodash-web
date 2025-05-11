// src/app/register/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  // const [password, setPassword] = useState(''); // Not used in simple auth logic
  // const [confirmPassword, setConfirmPassword] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // if (password !== confirmPassword) {
    //   alert("Passwords do not match!");
    //   return;
    // }
    if (register(username)) {
      // Don't redirect immediately, let user login
      // router.push('/login'); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>Create a new account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Username</label>
              <Input
                id="username"
                type="text"
                placeholder="chooseausername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {/* Password fields can be added for UI, but not used for auth logic here
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div> */}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full">Register</Button>
             <p className="text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-primary">
                Login here
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}