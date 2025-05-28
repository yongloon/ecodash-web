// src/app/admin/users/page.tsx
"use client"; 

import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate as globalMutateSWR } from 'swr'; // <<< MODIFIED: Import mutate for SWR
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, AlertTriangle, Edit2, ShieldAlert } from 'lucide-react'; // <<< ADDED ShieldAlert for modal
import { UserRole } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@prisma/client';
import toast from 'react-hot-toast'; // <<< ADDED
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // <<< ADDED
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // <<< ADDED
import { Label } from "@/components/ui/label"; // <<< ADDED

interface AdminUser extends Omit<User, 'passwordHash' | 'emailVerified' | 'image' | 'accounts' | 'sessions' | 'alerts' | 'favoriteIndicators' | 'updatedAt'> {
    role: UserRole; 
    stripeSubscriptionId: string | null;
}

const fetcher = async (url: string) => { /* ... (fetcher remains the same) ... */ };

const IS_DB_MODE_ACTIVE = !!process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE && process.env.NEXT_PUBLIC_DATABASE_MODE_ACTIVE === 'true';
const ITEMS_PER_PAGE = 10;

const getRoleBadgeVariant = (role: UserRole) => { /* ... (remains the same) ... */ };
const getMockUsers = (): AdminUser[] => [ /* ... (remains the same) ... */ ];


export default function AdminUsersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    // <<< ADDED STATE FOR ROLE CHANGE MODAL >>>
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [selectedNewRole, setSelectedNewRole] = useState<UserRole | undefined>(undefined);
    const [isRoleChangeLoading, setIsRoleChangeLoading] = useState(false);

    const { data: dbUsers, error, isLoading, mutate: mutateUserList } = useSWR<AdminUser[]>( // <<< ADDED mutateUserList
        IS_DB_MODE_ACTIVE ? `/api/admin/users` : null, 
        fetcher
    );

    const users = IS_DB_MODE_ACTIVE ? dbUsers : getMockUsers();
    const filteredUsers = useMemo(() => { /* ... (remains the same) ... */ }, [users, searchTerm]);
    const paginatedUsers = useMemo(() => { /* ... (remains the same) ... */ }, [filteredUsers, currentPage]);
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    if (isLoading && IS_DB_MODE_ACTIVE) { /* ... (remains the same) ... */ }
    if (error && IS_DB_MODE_ACTIVE) { /* ... (remains the same) ... */ }
    
    const handleOpenRoleModal = (user: AdminUser) => { // <<< MODIFIED
        if (!IS_DB_MODE_ACTIVE) {
            toast.error("User role editing is disabled in No Database mode.");
            return;
        }
        setEditingUser(user);
        setSelectedNewRole(user.role); // Pre-fill with current role
        setIsRoleModalOpen(true);
    };

    const confirmRoleChange = async () => { // <<< NEW FUNCTION
        if (!editingUser || !selectedNewRole) return;
        if (editingUser.role === selectedNewRole) {
            toast.info("No change in role detected.");
            setIsRoleModalOpen(false);
            return;
        }

        setIsRoleChangeLoading(true);
        const toastId = toast.loading(`Updating role for ${editingUser.email}...`);

        try {
            const response = await fetch('/api/admin/users/update-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIdToUpdate: editingUser.id, newRole: selectedNewRole }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update role.");
            }
            toast.success(data.message || "User role updated successfully!", { id: toastId });
            mutateUserList(); // Revalidate SWR user list
            setIsRoleModalOpen(false);
        } catch (err: any) {
            toast.error(err.message || "Could not update user role.", { id: toastId });
        } finally {
            setIsRoleChangeLoading(false);
            setEditingUser(null);
            setSelectedNewRole(undefined);
        }
    };


    return (
        <div className="space-y-6">
            {/* ... (header and search input remain the same) ... */}
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
                {/* ... (CardHeader and CardDescription remain the same) ... */}
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
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenRoleModal(user)} disabled={!IS_DB_MODE_ACTIVE}>
                                                    <Edit2 className="h-3.5 w-3.5 mr-1 sm:mr-0"/> <span className="hidden sm:inline">Edit Role</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                           {/* ... (Pagination remains the same) ... */}
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

            {/* <<< ROLE CHANGE MODAL >>> */}
            {editingUser && (
                <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center">
                                <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                                Change Role for: {editingUser.name || editingUser.email}
                            </DialogTitle>
                            <DialogDescription>
                                Current role: <Badge variant={getRoleBadgeVariant(editingUser.role)}>{editingUser.role}</Badge>.
                                Select the new role for this user.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role_select_admin" className="text-right col-span-1">
                                    New Role
                                </Label>
                                <Select
                                    value={selectedNewRole}
                                    onValueChange={(value: UserRole) => setSelectedNewRole(value)}
                                    disabled={isRoleChangeLoading}
                                >
                                    <SelectTrigger id="role_select_admin" className="col-span-3">
                                        <SelectValue placeholder="Select new role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={UserRole.USER}>USER</SelectItem>
                                        <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isRoleChangeLoading}>Cancel</Button>
                            </DialogClose>
                            <Button type="button" onClick={confirmRoleChange} disabled={isRoleChangeLoading || editingUser.role === selectedNewRole}>
                                {isRoleChangeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isRoleChangeLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}