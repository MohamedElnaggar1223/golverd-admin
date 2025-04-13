import { Suspense } from "react";
import VendorFinanceDetail from "./components/vendor-finance-detail";
import { getVendorById } from "@/lib/actions/vendor-actions";
import { getVendorBills } from "@/lib/actions/bill-actions";
import { notFound } from "next/navigation";
import { getQueryClient } from "@/lib/get-query-client";

export async function generateMetadata({ params }: { params: { id: string } }) {
    const queryClient = getQueryClient();

    // Prefetch vendor data for metadata
    try {
        const vendorData = await queryClient.fetchQuery({
            queryKey: ['vendor', params.id],
            queryFn: () => getVendorById(params.id)
        });

        return {
            title: `${vendorData.name} - Finance | Golverd Admin`,
            description: `Financial management for ${vendorData.name}`
        };
    } catch (error) {
        return {
            title: "Vendor - Finance | Golverd Admin",
            description: "Vendor financial details"
        };
    }
}

export default function VendorFinancePage({ params }: { params: { id: string } }) {
    try {
        const queryClient = getQueryClient();

        // Prefetch vendor data
        void queryClient.prefetchQuery({
            queryKey: ['vendor', params.id],
            queryFn: () => getVendorById(params.id)
        });

        // Prefetch vendor bills
        void queryClient.prefetchQuery({
            queryKey: ['vendorBills', params.id],
            queryFn: () => getVendorBills(params.id)
        });

        return (
            <Suspense fallback={<div>Loading...</div>}>
                <VendorFinanceDetail vendorId={params.id} />
            </Suspense>
        );
    } catch (error) {
        notFound();
    }
} 