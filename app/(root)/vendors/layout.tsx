import { getQueryClient } from "@/lib/get-query-client";
import { getVendors } from "@/lib/actions/vendor-actions";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

export const metadata = {
    title: "Vendors | Golverd Admin",
    description: "Manage vendor accounts and requests",
};

export default function VendorsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const queryClient = getQueryClient();

    // Prefetch all vendors data - we'll filter client-side to improve performance
    queryClient.prefetchQuery({
        queryKey: ["vendors"],
        queryFn: getVendors,
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            {children}
        </HydrationBoundary>
    );
} 