import { Suspense } from "react";
import Finance from "./components/finance";
import { getQueryClient } from "@/lib/get-query-client";
import { getBills } from "@/lib/actions/bill-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

export default function FinancePage() {
    const queryClient = getQueryClient();

    // Prefetch bills and vendors data
    void queryClient.prefetchQuery({
        queryKey: ['bills'],
        queryFn: getBills
    });

    void queryClient.prefetchQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Finance />
        </HydrationBoundary>
    )
} 