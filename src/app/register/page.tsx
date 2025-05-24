// src/app/register/page.tsx
"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Client-side validation state
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string | undefined> = {};
    if (!username.trim()) newErrors.username = "Username is required.";
    else if (username.trim().length < 3) newErrors.username = "Username must be at least 3 characters.";

    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email address.";
    
    if (!password) newErrors.password = "Password is required.";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters long.";
    
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
        // Focus the first field with an error
        const firstErrorKey = Object.keys(errors).find(key => errors[key]);
        if (firstErrorKey) {
            const field = document.getElementById(`${firstErrorKey}_reg`);
            field?.focus();
        }
        return;
    }

    setIsLoading(true);
    toast.dismiss(); // Clear previous toasts

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, username: username.trim(), email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Registration failed. Please try again.");
      } else {
        toast.success("Registration successful! Please proceed to login.");
        // Reset form fields after successful registration
        setName(''); setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
        // Optionally redirect:
        // setTimeout(() => router.push('/login'), 2000);
      }
    } catch (err) {
      toast.error("An unexpected error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    toast.loading("Redirecting to Google...");
    await signIn('google', { callbackUrl: '/' }).finally(() => {
        setIsLoading(false);
        toast.dismiss();
    }); 
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Register</CardTitle>
          <CardDescription>Create your EcoDash account.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate> {/* Added noValidate to rely on custom validation */}
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="name_reg" className="text-sm font-medium">Full Name (Optional)</label>
              <Input id="name_reg" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-1">
              <label htmlFor="username_reg" className="text-sm font-medium">Username</label>
              <Input id="username_reg" type="text" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isLoading} aria-invalid={!!errors.username} />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="email_reg" className="text-sm font-medium">Email</label>
              <Input id="email_reg" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="password_reg" className="text-sm font-medium">Password</label>
              <Input id="password_reg" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} aria-invalid={!!errors.password} />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm_password_reg" className="text-sm font-medium">Confirm Password</label>
              <Input id="confirm_password_reg" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} aria-invalid={!!errors.confirmPassword} />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && !email.includes("google") ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              {isLoading && !email.includes("google") ? 'Registering...' : 'Create Account'}
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading}>
              {isLoading && email.includes("google") ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FaGoogle className="mr-2 h-4 w-4" /> }
               Google
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