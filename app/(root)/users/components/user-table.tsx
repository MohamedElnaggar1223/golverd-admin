'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { getUsers, deleteUser } from '@/lib/actions/user-actions';
import { useDebounce } from '@/lib/hooks/use-debounce';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/spinner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Search, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { IUser } from '@/models/User';
import { toast } from 'sonner';

// Define a type for the user as returned by MongoDB lean query
type LeanUser = Omit<IUser, 'addresses'> & {
    addresses: Record<string, any>;
    _id: string;
    __v: number;
};

interface UserTableProps {
    onUserSelect: (userId: string, userName: string) => void;
}

const USERS_PER_PAGE = 10;

export default function UserTable({ onUserSelect }: UserTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = useQueryClient();

    // Fetch all users
    const { data: users, isLoading, error } = useSuspenseQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });

    // Delete user mutation
    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onSuccess: () => {
            toast.success('User deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setConfirmDialogOpen(false);

            // If the deleted user was selected, reset selection
            if (userToDelete === selectedUserId) {
                setSelectedUserId(null);
            }
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete user: ${error.message}`);
            setConfirmDialogOpen(false);
        },
    });

    // Filter users based on search
    const filteredUsers = useMemo(() => {
        if (!users) return [];

        if (!debouncedSearch) return users;

        const searchLower = debouncedSearch.toLowerCase();
        return users.filter((user: LeanUser) =>
            (user.firstName?.toLowerCase() || '').includes(searchLower) ||
            (user.lastName?.toLowerCase() || '').includes(searchLower) ||
            (user.email?.toLowerCase() || '').includes(searchLower) ||
            (user.phone?.toLowerCase() || '').includes(searchLower)
        );
    }, [users, debouncedSearch]);

    // Paginate filtered users
    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Total pages calculation
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));

    // Handle pagination
    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Handle user selection
    const handleUserSelect = (user: LeanUser) => {
        setSelectedUserId(user._id);
        onUserSelect(user._id, `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email);
    };

    // Open delete confirmation dialog
    const confirmDelete = (userId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering user selection
        setUserToDelete(userId);
        setConfirmDialogOpen(true);
    };

    // Execute delete
    const handleDeleteUser = () => {
        if (userToDelete) {
            deleteMutation.mutate(userToDelete);
        }
    };

    return (
        <>
            <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
                <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                    <CardTitle className="text-lg font-medium">Users</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8 rounded-[4px] pr-4 py-5 bg-[#E8E4E1] border border-[#44312D]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center min-h-[400px]">
                            <Spinner size="lg" />
                        </div>
                    ) : error ? (
                        <div className="flex justify-center items-center min-h-[400px] text-red-500">
                            Error loading users
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2 text-muted-foreground">
                            <User className="h-8 w-8 text-muted-foreground" />
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-[#F7F3F2]">
                                    <TableRow>
                                        <TableHead className="font-medium text-[#44312D] w-[30%]">Name</TableHead>
                                        <TableHead className="font-medium text-[#44312D] w-[25%]">Email</TableHead>
                                        <TableHead className="font-medium text-[#44312D] w-[20%]">Phone</TableHead>
                                        <TableHead className="font-medium text-[#44312D] w-[15%]">Created</TableHead>
                                        <TableHead className="font-medium text-[#44312D] w-[10%]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedUsers.map((user: LeanUser) => (
                                        <TableRow
                                            key={user._id}
                                            className={`border-b border-gray-100 cursor-pointer ${selectedUserId === user._id
                                                ? 'bg-[#F7F3F2]'
                                                : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => handleUserSelect(user)}
                                        >
                                            <TableCell className="font-medium">
                                                {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name'}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.phone || 'N/A'}</TableCell>
                                            <TableCell>
                                                {user.createdAt ? new Date(user.createdAt._seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => confirmDelete(user._id, e)}
                                                    className="text-gray-500 hover:text-red-600 hover:bg-transparent"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                {filteredUsers.length > USERS_PER_PAGE && (
                    <CardFooter className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToPrevPage}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-[4px] border-[#44312D]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-[4px] border-[#44312D]"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </Card>

            {/* Delete confirmation dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone.
                            All user data, including orders and appointments, will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Spinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 