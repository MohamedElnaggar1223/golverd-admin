import { getQueryClient } from "@/lib/get-query-client";
import { getTeamMembers } from "@/lib/actions/team-actions";
import { getPositions } from "@/lib/actions/team-actions";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getVendors } from "@/lib/actions/vendor-actions";

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

export default function TeamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const queryClient = getQueryClient()

    void queryClient.prefetchQuery({
        queryKey: ['team-members'],
        queryFn: getTeamMembers,
    })

    void queryClient.prefetchQuery({
        queryKey: ['positions'],
        queryFn: getPositions
    })

    void queryClient.prefetchQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
        </HydrationBoundary>
    )
}
