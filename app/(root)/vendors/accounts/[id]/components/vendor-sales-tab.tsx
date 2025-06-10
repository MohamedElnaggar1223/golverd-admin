'use client';

import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getOrders } from "@/lib/actions/order-actions";
import { getAppointments } from "@/lib/actions/appointment-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface VendorSalesTabProps {
    vendorId: string;
}

interface Sale {
    id: string;
    clientName: string;
    date: Date;
    price: number;
    status: string;
    type: 'order' | 'appointment';
}

export function VendorSalesTab({ vendorId }: VendorSalesTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch all orders
    const { data: allOrders = [] } = useSuspenseQuery({
        queryKey: ['orders'],
        queryFn: getOrders
    });

    // Fetch all appointments
    const { data: allAppointments = [] } = useSuspenseQuery({
        queryKey: ['appointments'],
        queryFn: getAppointments
    });

    // Filter orders by vendor ID and only show converted sales
    const vendorOrders = useMemo(() => {
        return allOrders.filter((order: any) =>
            order.vendorID?._id === vendorId &&
            order.status === 'Completed'
        );
    }, [allOrders, vendorId]);

    // Filter appointments by vendor ID and only show converted sales
    const vendorAppointments = useMemo(() => {
        return allAppointments.filter((appointment: any) =>
            (appointment.vendorID?._id === vendorId || appointment.vendorID === vendorId) &&
            appointment.saleStatus?.toLowerCase() === 'sold'
        );
    }, [allAppointments, vendorId]);

    // Combine orders and appointments into a single list of sales
    const combinedSales: Sale[] = useMemo(() => {
        const orderSales = vendorOrders.map((order: any) => ({
            id: order._id,
            clientName: order.clientName || order.clientID || 'Unknown',
            date: order.orderDate ? new Date(order.orderDate._seconds * 1000) : new Date(),
            price: order.price || 0,
            status: order.status || 'Unknown',
            type: 'order' as const
        }));

        const appointmentSales = vendorAppointments.map((appointment: any) => ({
            id: appointment._id,
            clientName: appointment.clientName || appointment.customerName || 'Unknown',
            date: appointment.date ? new Date(appointment.date) : new Date(),
            price: appointment.price || 0,
            status: appointment.status || 'Unknown',
            type: 'appointment' as const
        }));

        return [...orderSales, ...appointmentSales].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [vendorOrders, vendorAppointments]);

    // Calculate monthly sales data for chart
    const monthlySalesData = useMemo(() => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const data = months.map(month => ({
            name: month,
            orders: 0,
            appointments: 0,
            total: 0
        }));

        combinedSales.forEach((sale) => {
            if (sale.date.getFullYear() === selectedYear) {
                const monthIndex = sale.date.getMonth();
                if (sale.type === 'order') {
                    data[monthIndex].orders += 1;
                } else {
                    data[monthIndex].appointments += 1;
                }
                data[monthIndex].total += 1;
            }
        });

        return data;
    }, [combinedSales, selectedYear]);

    // Filter sales based on search and type
    const filteredSales = useMemo(() => {
        return combinedSales.filter((sale) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                sale.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                sale.clientName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                sale.status.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                sale.type.toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply type filter
            const matchesType = typeFilter === 'all' || sale.type === typeFilter;

            return matchesSearch && matchesType;
        });
    }, [combinedSales, debouncedSearch, typeFilter]);

    // Get status badge styling
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'completed': 'bg-green-100 text-green-800 hover:bg-green-100',
            'processing': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
            'shipped': 'bg-purple-100 text-purple-800 hover:bg-purple-100',
            'cancelled': 'bg-red-100 text-red-800 hover:bg-red-100',
            'pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            'upcoming': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
            'sold': 'bg-green-100 text-green-800 hover:bg-green-100'
        };

        return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    };

    // Get type badge styling
    const getTypeBadge = (type: 'order' | 'appointment') => {
        return type === 'order'
            ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
            : 'bg-purple-100 text-purple-800 hover:bg-purple-100';
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
                    <CardTitle className="text-lg font-medium">Monthly Sales</CardTitle>
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
                                data={monthlySalesData}
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
                                <Line
                                    type="monotone"
                                    dataKey="appointments"
                                    stroke="#82ca9d"
                                    activeDot={{ r: 8 }}
                                    name="Appointments"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#ff7300"
                                    activeDot={{ r: 8 }}
                                    name="Total Sales"
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
                        placeholder="Search sales..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] rounded-sm bg-white">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="order">Orders</SelectItem>
                        <SelectItem value="appointment">Appointments</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="h-[calc(100vh-600px)]">
                <Table>
                    <TableHeader className="bg-[#F7F3F2]">
                        <TableRow>
                            <TableHead className="font-medium text-[#44312D]">ID</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Type</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Client Name</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Price</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Status</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSales.map((sale) => (
                            <TableRow key={sale.id} className="border-b border-gray-100">
                                <TableCell className="font-medium">#{sale.id.slice(-8)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`font-normal rounded-sm ${getTypeBadge(sale.type)}`}>
                                        {sale.type === 'order' ? 'Order' : 'Appointment'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{sale.clientName}</TableCell>
                                <TableCell>{formatCurrency(sale.price, 'en-US', 'EGP')}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`font-normal rounded-sm ${getStatusBadge(sale.status)}`}>
                                        {sale.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{formatDate(sale.date.toString(), 'MM/dd/yyyy')}</TableCell>
                            </TableRow>
                        ))}

                        {filteredSales.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No sales found. Try adjusting your search or filter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
} 