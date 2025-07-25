'use client';

import { useState, useMemo } from "react";
import { useQuery, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrders, toggleOrderSaleStatus } from "@/lib/actions/order-actions";
import { getProductsByIds } from "@/lib/actions/product-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Spinner } from "@/components/shared/spinner";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface Product {
    id: string;
    name: string;
    image?: string;
    category?: string;
    price?: number;
    quantity?: number;
}

interface VendorOrdersTabProps {
    vendorId: string;
}

export function VendorOrdersTab({ vendorId }: VendorOrdersTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = useQueryClient();

    // Fetch all orders
    const { data: allOrders = [] } = useSuspenseQuery({
        queryKey: ['orders'],
        queryFn: getOrders
    });

    // Filter orders by vendor ID and show pending/cancelled orders that haven't been converted to sales
    const vendorOrders = useMemo(() => {
        return allOrders.filter((order: any) =>
            order.vendorID?._id === vendorId &&
            (order.status === 'pending' || order.status === 'cancelled') &&
            order.saleStatus !== 'Sold'
        );
    }, [allOrders, vendorId]);

    // Get all unique product IDs from vendor orders
    const productIds = useMemo(() => {
        const ids = new Set<string>();
        vendorOrders.forEach((order: any) => {
            if (order.items) {
                Object.keys(order.items).forEach(id => ids.add(id));
            }
        });
        return Array.from(ids);
    }, [vendorOrders]);

    // Fetch product details for all product IDs at once
    const { data: productsMap = {} } = useQuery({
        queryKey: ['products', productIds],
        queryFn: async () => {
            if (productIds.length === 0) return {};
            return getProductsByIds(productIds);
        },
        enabled: !!productIds.length
    });

    // Process order items for display
    const getOrderItems = (order: any): Product[] => {
        if (!order.items) return [];

        return Object.entries(order.items).map(([productId, quantity]) => {
            const product = (productsMap as Record<string, any>)[productId];

            return {
                id: productId,
                name: product?.name || productId.split('-').slice(1).join(' '),
                quantity: Number(quantity),
                price: order.charges?.[productId]?.price,
                image: product?.images?.[0] || '',
                category: product?.category || 'Product'
            };
        });
    };

    // Calculate monthly order data for chart
    const monthlyOrderData = useMemo(() => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const data = months.map(month => ({ name: month, orders: 0 }));

        vendorOrders.forEach((order: any) => {
            if (order.orderDate) {
                const orderDate = new Date(order.orderDate._seconds * 1000);
                if (orderDate.getFullYear() === selectedYear) {
                    const monthIndex = orderDate.getMonth();
                    data[monthIndex].orders += 1;
                }
            }
        });

        return data;
    }, [vendorOrders, selectedYear]);

    // Filter orders based on search only (status is already filtered to pending)
    const filteredOrders = useMemo(() => {
        return vendorOrders.filter((order: any) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                order._id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.clientName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.paymentMethod || '').toLowerCase().includes(debouncedSearch.toLowerCase());

            return matchesSearch;
        });
    }, [vendorOrders, debouncedSearch]);

    // Mutation for toggling sale status
    const toggleSaleStatusMutation = useMutation({
        mutationFn: async (orderId: string) => {
            setIsUpdating(orderId);
            try {
                await toggleOrderSaleStatus(orderId);
            } finally {
                setIsUpdating(null);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast("Sale status updated", {
                description: "The order has been converted to sale successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to convert order to sale",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    // Handle showing product details in dialog
    const showProductDetails = (products: Product[]) => {
        setSelectedProducts(products);
        setIsDialogOpen(true);
    };



    // Create initials for product avatar fallback
    const getProductInitials = (name: string): string => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    // Generate year options
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        // Show last 5 years
        for (let i = 0; i < 5; i++) {
            years.push(currentYear - i);
        }
        return years;
    }, []);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">Monthly Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                            <SelectTrigger className="w-[100px] bg-white">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={monthlyOrderData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#8884d8"
                                    activeDot={{ r: 8 }}
                                    name="Orders"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search orders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
            </div>

            <ScrollArea className="h-[calc(100vh-600px)]">
                <Table>
                    <TableHeader className="bg-[#F7F3F2]">
                        <TableRow>
                            <TableHead className="font-medium text-[#44312D] w-[100px]"></TableHead>
                            <TableHead className="font-medium text-[#44312D]">Order ID</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Client Name</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Price</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Payment Method</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Convert to Sale</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order: any) => {
                            const orderItems = getOrderItems(order);
                            const displayItems = orderItems.slice(0, 3);
                            const remainingCount = orderItems.length - 3;

                            return (
                                <TableRow key={order._id} className="border-b border-gray-100">
                                    <TableCell>
                                        <div className="flex -space-x-2" onClick={() => showProductDetails(orderItems)}>
                                            {displayItems.map((item, idx) => (
                                                <Avatar key={idx} className="h-8 w-8 border-2 border-white cursor-pointer hover:border-gray-200 transition-all">
                                                    <AvatarImage src={item.image} alt={item.name} />
                                                    <AvatarFallback className="bg-[#E8E4E1] text-xs">
                                                        {getProductInitials(item.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {remainingCount > 0 && (
                                                <Avatar className="h-8 w-8 border-2 border-white bg-gray-100 cursor-pointer hover:border-gray-200 transition-all">
                                                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                                        +{remainingCount}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">#{order._id.slice(-8)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{order.clientName || order.clientID || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">
                                                Joined: {order.clientID?.createdAt
                                                    ? formatDate(new Date(order.clientID?.createdAt._seconds * 1000).toString(), 'MM/dd/yyyy')
                                                    : 'N/A'
                                                }
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(order.price || 0, 'en-US', 'EGP')}</TableCell>
                                    <TableCell>{order.paymentMethod || 'N/A'}</TableCell>
                                    <TableCell>
                                        {order.status === 'pending' ? (
                                            <Button
                                                size="sm"
                                                className="bg-[#44312D] hover:bg-[#2D1F1B] text-white"
                                                onClick={() => toggleSaleStatusMutation.mutate(order._id)}
                                                disabled={isUpdating === order._id}
                                            >
                                                {isUpdating === order._id ? (
                                                    <Spinner className="h-3 w-3 mr-2" />
                                                ) : null}
                                                Convert to Sale
                                            </Button>
                                        ) : (
                                            <Badge variant="outline" className="font-normal rounded-sm bg-red-100 text-red-800 hover:bg-red-100">
                                                Cancelled
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {order.orderDate
                                            ? formatDate(new Date(order.orderDate._seconds * 1000).toString(), 'MM/dd/yyyy')
                                            : 'N/A'
                                        }
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {filteredOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No orders found. Try adjusting your search.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>

            {/* Products Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Order Products</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {selectedProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center gap-3 py-2">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={product.image} alt={product.name} />
                                    <AvatarFallback className="bg-[#E8E4E1]">
                                        {getProductInitials(product.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h4 className="font-medium">{product.name}</h4>
                                    <p className="text-sm text-gray-500">{product.category || 'Product'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">{product.quantity}x</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 