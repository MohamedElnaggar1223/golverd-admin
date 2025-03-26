import { getQueryClient } from "@/lib/get-query-client";
import { getUsers } from "@/lib/actions/user-actions";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata = {
    title: 'Users Management',
    description: 'Manage users, view their orders and appointments, and send notifications.',
};

export default function UsersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const queryClient = getQueryClient();

    // Prefetch all users data at once for client-side filtering
    void queryClient.prefetchQuery({
        queryKey: ['users'],
        queryFn: getUsers,
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
        </HydrationBoundary>
    );
} 