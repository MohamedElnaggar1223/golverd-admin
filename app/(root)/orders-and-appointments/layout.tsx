import { getQueryClient } from "@/lib/get-query-client";
import { getOrders } from "@/lib/actions/order-actions";
import { getAppointments } from "@/lib/actions/appointment-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata = {
    title: "Orders & Appointments | Golverd Admin",
    description: "Manage orders, appointments, and view analytics",
};

export default function OrdersAndAppointmentsLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const queryClient = getQueryClient();

    // Prefetch all orders, appointments, and vendors data
    queryClient.prefetchQuery({
        queryKey: ["orders"],
        queryFn: getOrders,
    });

    queryClient.prefetchQuery({
        queryKey: ["appointments"],
        queryFn: getAppointments,
    });

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