'use client';

import { useState, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getOrders } from "@/lib/actions/order-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { getProductsByIds } from "@/lib/actions/product-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

interface Product {
    id: string;
    name: string;
    image?: string;
    category?: string;
    price?: number;
    quantity?: number;
}

export function OrdersTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [vendorFilter, setVendorFilter] = useState('all');
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch all orders
    const { data: orders = [] } = useSuspenseQuery({
        queryKey: ['orders'],
        queryFn: getOrders
    });

    console.log(orders);

    // Fetch all vendors for the filter
    const { data: vendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    // Get all unique product IDs from all orders
    const productIds = useMemo(() => {
        const ids = new Set<string>();
        orders.forEach((order: any) => {
            if (order.items) {
                Object.keys(order.items).forEach(id => ids.add(id));
            }
        });
        return Array.from(ids);
    }, [orders]);

    // Fetch product details for all product IDs at once
    const { data: productsMap = {} } = useQuery({
        queryKey: ['products', productIds],
        queryFn: async () => {
            if (productIds.length === 0) return {};
            return getProductsByIds(productIds);
        }
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

    // Filter orders based on search and vendor filter
    const filteredOrders = useMemo(() => {
        return orders.filter((order: any) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                order._id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.vendorID?.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.clientName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.address?.address || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.status || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (order.paymentMethod || '').toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply vendor filter
            const matchesVendor = vendorFilter === 'all' || order.vendorID?._id === vendorFilter;

            return matchesSearch && matchesVendor;
        });
    }, [orders, debouncedSearch, vendorFilter]);

    // Handle showing product details in dialog
    const showProductDetails = (products: Product[]) => {
        setSelectedProducts(products);
        setIsDialogOpen(true);
    };

    // Get status badge styling
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

    // Create initials for product avatar fallback
    const getProductInitials = (name: string): string => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="space-y-6">
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
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] rounded-sm bg-white">
                        <SelectValue placeholder="Filter by vendor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {vendors?.map((vendor: any) => (
                            <SelectItem key={vendor._id} value={vendor._id}>
                                {vendor.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
                <Table>
                    <TableHeader className="bg-[#F7F3F2]">
                        <TableRow>
                            <TableHead className="font-medium text-[#44312D] w-[100px]"></TableHead>
                            <TableHead className="font-medium text-[#44312D]">Order ID</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Vendor Name</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Client Name</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Address</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Price</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Payment Method</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Status</TableHead>
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
                                    <TableCell>{order.vendorID?.name || 'N/A'}</TableCell>
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
                                    <TableCell>
                                        <div className="max-w-[200px] truncate" title={order.address?.address || 'N/A'}>
                                            {order.address?.address || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(order.price || 0, 'en-US', 'EGP')}</TableCell>
                                    <TableCell>{order.paymentMethod || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`font-normal rounded-sm ${getStatusBadge(order.status)}`}>
                                            {order.status}
                                        </Badge>
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
                                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                    No orders found. Try adjusting your search or filter.
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