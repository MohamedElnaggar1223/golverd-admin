'use client';

import { useSuspenseQuery } from "@tanstack/react-query";
import { filterVendorsByCategory } from "@/lib/vendor-utils";
import { VendorGrid } from "./vendor-grid";
import { getVendors } from "@/lib/actions/vendor-actions";

export function AllVendorsTab() {
    // Get all vendors from cache and filter client-side
    const { data: allVendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: () => getVendors() // Data is loaded from HydrationBoundary
    });

    const vendors = filterVendorsByCategory(allVendors, 'all');

    return <VendorGrid vendors={vendors} />;
} 