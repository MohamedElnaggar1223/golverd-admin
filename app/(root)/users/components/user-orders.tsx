'use client';

import { useMemo, useState } from 'react';
import { getUserOrders } from '@/lib/actions/user-actions';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
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
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/shared/spinner';
import { Search, ShoppingBag } from 'lucide-react';
import { IOrder } from '@/models/Order';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getQueryClient } from '@/lib/get-query-client';

interface UserOrdersProps {
    selectedUserId: string | null;
}

// Type for a lean Order document
type LeanOrder = Omit<IOrder, 'items' | 'charges'> & {
    items: Record<string, number>;
    charges: Record<string, any>;
    vendorID: {
        name: string;
    };
    _id: string;
    __v: number;
};

// Helper type for rendering item
interface OrderItem {
    productId: string;
    quantity: number;
    productName: string;
}

export default function UserOrders({ selectedUserId }: UserOrdersProps) {
    const queryClient = getQueryClient()

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const allOrders = queryClient.getQueryData<LeanOrder[]>(['orders'])

    // Fetch orders
    const ordersQuery = useQuery({
        queryKey: ['orders', selectedUserId],
        queryFn: () => selectedUserId ? allOrders?.length ? allOrders.filter(order => order.clientID === selectedUserId) : getUserOrders(selectedUserId) : Promise.resolve([]),
        enabled: !!selectedUserId,
    });

    console.log(ordersQuery.data);

    // Process order items for display (convert Map to array of named items)
    const getOrderItems = (order: LeanOrder): OrderItem[] => {
        if (!order.items) return [];

        // Convert Map-like object to array of items
        return Object.entries(order.items).map(([productId, quantity]) => ({
            productId,
            quantity,
            productName: productId.split('-').slice(1).join(' ') // Extract product name from ID
        }));
    };

    // Filter orders based on search
    const filteredOrders = useMemo(() => {
        if (!ordersQuery.data) return [];

        if (!debouncedSearch.trim()) return ordersQuery.data;

        const search = debouncedSearch.toLowerCase();
        return ordersQuery.data.filter((order: LeanOrder) => {
            // Search by order ID
            if (order._id?.toLowerCase().includes(search)) return true;

            // Search by status
            if (order.status?.toLowerCase().includes(search)) return true;

            // Search in items
            const items = getOrderItems(order);
            return items.some(item =>
                item.productName.toLowerCase().includes(search)
            );
        });
    }, [ordersQuery.data, debouncedSearch]);

    // Calculate total price from order
    const getOrderTotal = (order: LeanOrder): number => {
        return order.price || 0;
    };

    // Status badge styling
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'completed': 'bg-green-100 text-green-800 hover:bg-green-100',
            'processing': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
            'shipped': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
            'cancelled': 'bg-red-100 text-red-800 hover:bg-red-100',
            'pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        };

        return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    };

    if (!selectedUserId) {
        return (
            <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
                <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                    <CardTitle className="text-lg font-medium">Orders</CardTitle>
                </CardHeader>
                <CardContent className="p-6 min-h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                        Select a user to view their orders
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
            <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                <CardTitle className="text-lg font-medium">Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                    <Input
                        placeholder="Search orders..."
                        className="pl-8 rounded-[4px] pr-4 py-5 bg-[#E8E4E1] border border-[#44312D]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {ordersQuery.isLoading ? (
                    <div className="flex justify-center items-center min-h-[300px]">
                        <Spinner size="lg" />
                    </div>
                ) : ordersQuery.isError ? (
                    <div className="flex justify-center items-center min-h-[300px] text-red-500">
                        Error loading orders
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        <p>No orders found</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        <Table>
                            <TableHeader className="bg-[#F7F3F2]">
                                <TableRow>
                                    <TableHead className="font-medium text-[#44312D]">Order ID</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Vendor Name</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Payment Method</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Status</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order: LeanOrder) => {
                                    const orderItems = getOrderItems(order);
                                    return (
                                        <TableRow key={order._id} className="border-b border-gray-100">
                                            <TableCell className="py-3 font-medium">
                                                #{order._id.slice(-8)}
                                            </TableCell>
                                            <TableCell>
                                                {/* <div className="flex flex-col">
                                                    {orderItems.slice(0, 2).map((item, index) => (
                                                        <span key={index} className="text-sm">
                                                            {item.quantity}x {item.productName}
                                                        </span>
                                                    ))}
                                                    {orderItems.length > 2 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            +{orderItems.length - 2} more items
                                                        </span>
                                                    )}
                                                </div> */}
                                                {order.vendorID?.name}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {order.paymentMethod}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`font-normal rounded-sm ${getStatusBadge(order.status)}`}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(new Date(order.orderDate?._seconds * 1000).toString(), 'MM/dd/yyyy')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
} 