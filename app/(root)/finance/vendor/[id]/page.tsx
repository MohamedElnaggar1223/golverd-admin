import { Suspense } from "react";
import VendorFinanceDetail from "./components/vendor-finance-detail";
import { getVendorById } from "@/lib/actions/vendor-actions";
import { getVendorBills } from "@/lib/actions/bill-actions";
import { notFound } from "next/navigation";
import { getQueryClient } from "@/lib/get-query-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const queryClient = getQueryClient();
    const { id } = await params;

    // Prefetch vendor data for metadata
    try {
        const vendorData = await queryClient.fetchQuery({
            queryKey: ['vendor', id],
            queryFn: () => getVendorById(id)
        });

        return {
            title: `${vendorData?.name} - Finance | Golverd Admin`,
            description: `Financial management for ${vendorData?.name}`
        };
    } catch (error) {
        return {
            title: "Vendor - Finance | Golverd Admin",
            description: "Vendor financial details"
        };
    }
}

export default async function VendorFinancePage({ params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const queryClient = getQueryClient();

        // Prefetch vendor data
        void queryClient.prefetchQuery({
            queryKey: ['vendor', id],
            queryFn: () => getVendorById(id)
        });

        // Prefetch vendor bills
        void queryClient.prefetchQuery({
            queryKey: ['vendorBills', id],
            queryFn: () => getVendorBills(id)
        });

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <VendorFinanceDetail vendorId={id} />
            </Suspense>
        );
    } catch (error) {
        notFound();
    }
} 