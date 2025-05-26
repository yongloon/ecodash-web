// src/app/admin/users/page.tsx
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge'; // Import badgeVariants
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { UserRole } from '@/app/api/auth/[...nextauth]/route'; // Import UserRole

// Helper to determine badge variant based on role
const getRoleBadgeVariant = (role: UserRole) => { // Use UserRole type
    if (role === 'ADMIN') return 'destructive';
    return 'secondary';
};
    
async function getUsers() {
    if (!prisma) {
        const demoAdminDate = new Date();
        const demoUserDate = new Date(demoAdminDate.getTime() - 86400000 * 2); // 2 days ago
        return [
            { id: 'demo1', name: 'Demo User One', email: 'user1@example.com', username: 'demouser1', role: 'USER' as UserRole, createdAt: demoUserDate, stripeSubscriptionId: null },
            { id: 'demo2', name: 'Demo Admin', email: 'admin@example.com', username: 'admin', role: 'ADMIN' as UserRole, createdAt: demoAdminDate, stripeSubscriptionId: 'sub_demopro' },
            { id: 'demo3', name: 'Demo Basic User', email: 'basic@example.com', username: 'basic', role: 'USER' as UserRole, createdAt: demoUserDate, stripeSubscriptionId: 'sub_demobasic' },
        ];
    }
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                role: true,
                createdAt: true,
                stripeSubscriptionId: true, 
            }
        });
        return users;
    } catch (error) {
        console.error("Failed to fetch users for admin panel:", error);
        return [];
    }
}

export default async function AdminUsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/admin">
                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to Admin Dashboard</span>
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        List of all registered users in the system. 
                        {!prisma && " (Displaying mock data as database is not connected)"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {users.length === 0 && !prisma && (
                        <p className="text-muted-foreground">No mock users to display.</p>
                    )}
                    {users.length === 0 && prisma && (
                         <p className="text-muted-foreground">No users found in the database.</p>
                    )}
                    {users.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Subscription</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                                        <TableCell>{user.email || 'N/A'}</TableCell>
                                        <TableCell>{user.username || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.stripeSubscriptionId ? <Badge variant="success">Active</Badge> : <Badge variant="outline">None</Badge>}
                                        </TableCell>
                                        <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" disabled>Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}