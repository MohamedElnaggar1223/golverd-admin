import { Suspense } from "react";
import Finance from "./components/finance";
import { getQueryClient } from "@/lib/get-query-client";
import { getBills } from "@/lib/actions/bill-actions";
import { getVendors } from "@/lib/actions/vendor-actions";

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
        <Suspense>
            <Finance />
        </Suspense>
    )
} 