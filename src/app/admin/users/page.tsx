// src/app/admin/users/page.tsx
"use client"; // Make it a client component for interactivity

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // For search
import { ArrowLeft, Loader2, AlertTriangle, Edit2 } from 'lucide-react';
import { UserRole } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@prisma/client'; // Import Prisma User type if available or define one

interface AdminUser extends Omit<User, 'passwordHash' | 'emailVerified' | 'image' | 'accounts' | 'sessions' | 'alerts' | 'favoriteIndicators' | 'updatedAt'> {
    // Define only the fields selected or needed from the API
    role: UserRole; // Make sure UserRole matches the enum/type from NextAuth
    stripeSubscriptionId: string | null;
}


const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to fetch users" }));
        const error = new Error(errorData.error || 'An error occurred.');
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
};

const IS_DB_MODE_ACTIVE = !!process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE && process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE === 'true';
const ITEMS_PER_PAGE = 10;

const getRoleBadgeVariant = (role: UserRole) => {
    if (role === 'ADMIN') return 'destructive';
    return 'secondary';
};

const getMockUsers = (): AdminUser[] => [
    { id: 'demo1', name: 'Demo User One', email: 'user1@example.com', username: 'demouser1', role: 'USER', createdAt: new Date(Date.now() - 86400000 * 3), stripeSubscriptionId: null, stripeCustomerId: null, stripePriceId: null, stripeCurrentPeriodEnd: null },
    { id: 'demo2', name: 'Demo Admin', email: 'admin@example.com', username: 'admin', role: 'ADMIN', createdAt: new Date(), stripeSubscriptionId: 'sub_demopro', stripeCustomerId: null, stripePriceId: null, stripeCurrentPeriodEnd: null },
    { id: 'demo3', name: 'Demo Basic User', email: 'basic@example.com', username: 'basic', role: 'USER', createdAt: new Date(Date.now() - 86400000 * 2), stripeSubscriptionId: 'sub_demobasic', stripeCustomerId: null, stripePriceId: null, stripeCurrentPeriodEnd: null },
    // Add more mock users for pagination testing
    ...Array.from({ length: 12 }, (_, i) => ({ id: `mockextra-${i}`, name: `Extra User ${i + 1}`, email: `extra${i+1}@example.com`, username: `extra${i+1}`, role: 'USER' as UserRole, createdAt: new Date(Date.now() - 86400000 * (i + 5)), stripeSubscriptionId: null, stripeCustomerId: null, stripePriceId: null, stripeCurrentPeriodEnd: null })),
];


export default function AdminUsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const { data: dbUsers, error, isLoading } = useSWR<AdminUser[]>(
        IS_DB_MODE_ACTIVE ? `/api/admin/users` : null, // Fetch only if DB mode is active
        fetcher
    );

    const users = IS_DB_MODE_ACTIVE ? dbUsers : getMockUsers();

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(user =>
            (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    if (isLoading && IS_DB_MODE_ACTIVE) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error && IS_DB_MODE_ACTIVE) {
        return (
            <div className="text-center py-10 text-destructive">
                <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                <p>Failed to load users: {(error as any).message}</p>
            </div>
        );
    }
    
    const handleEditUserRole = (userId: string, currentRole: UserRole) => {
        // This is where you'd open a modal or inline editing UI
        // For now, just a placeholder
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        toast(<span>Change role of user <strong>{userId.substring(0,8)}...</strong> to <strong>{newRole}</strong>? (API not implemented yet)
            <Button size="sm" variant="link" className="ml-2" onClick={() => toast.dismiss()}>OK</Button>
        </span>, {duration: 10000});
        // Call API: POST /api/admin/users/update-role { userId, newRole }
        // Then mutateSWR('/api/admin/users');
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <Link href="/admin">
                        <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back to Admin Dashboard</span>
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                </div>
                <Input
                    type="search"
                    placeholder="Search users (name, email, username)..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                    className="w-full sm:w-64 md:w-80 h-9"
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        List of all registered users. 
                        {!IS_DB_MODE_ACTIVE && " (Displaying mock data as database is not connected)"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {paginatedUsers.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center">
                            {searchTerm ? "No users match your search." : "No users found."}
                        </p>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden sm:table-cell">Email</TableHead>
                                        <TableHead className="hidden md:table-cell">Username</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="hidden md:table-cell">Subscription</TableHead>
                                        <TableHead className="hidden lg:table-cell">Joined</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium py-2">{user.name || 'N/A'}</TableCell>
                                            <TableCell className="hidden sm:table-cell py-2">{user.email || 'N/A'}</TableCell>
                                            <TableCell className="hidden md:table-cell py-2">{user.username || 'N/A'}</TableCell>
                                            <TableCell className="py-2">
                                                <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell py-2">
                                                {user.stripeSubscriptionId ? <Badge variant="success">Active</Badge> : <Badge variant="outline">None</Badge>}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell py-2">{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="text-right py-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditUserRole(user.id, user.role)} disabled={!IS_DB_MODE_ACTIVE /* Disable edit in no DB mode for now*/}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-1 sm:mr-0"/> <span className="hidden sm:inline">Edit Role</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}