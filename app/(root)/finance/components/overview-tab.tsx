'use client';

import { useState, useMemo } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getBills } from "@/lib/actions/bill-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getVendorCategory } from "@/lib/vendor-utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getQueryClient } from "@/lib/get-query-client";

export function OverviewTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [segmentFilter, setSegmentFilter] = useState('all');
    const [isGeneratingBills, setIsGeneratingBills] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = getQueryClient();

    // Fetch bills from prefetched data
    const { data: bills = [] } = useSuspenseQuery({
        queryKey: ['bills'],
        queryFn: getBills
    });

    // Fetch vendors from prefetched data
    const { data: vendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    // Handle bill generation
    const handleGenerateBills = async () => {
        if (isGeneratingBills) return;

        try {
            setIsGeneratingBills(true);
            toast.loading("Generating monthly bills...");

            const response = await fetch('/api/bills/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate bills');
            }

            // Invalidate bills query
            void queryClient.invalidateQueries({ queryKey: ['bills'] });

            toast.success(data.message || `Bills generated successfully. Created: ${data.created}, Skipped: ${data.skipped}`);
        } catch (error: any) {
            console.error('Error generating bills:', error);
            toast.error(error.message || 'Failed to generate bills');
        } finally {
            setIsGeneratingBills(false);
        }
    };

    // Filter bills based on search, status and segment filters
    const filteredBills = useMemo(() => {
        return bills.filter((bill: any) => {
            // Apply search filter to vendor name and bill ID
            const matchesSearch = !debouncedSearch ||
                bill._id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (bill.vendor?.name || '').toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply status filter
            const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;

            // Apply segment filter (Gold, Silver, Raw)
            const matchesSegment = segmentFilter === 'all' ||
                getVendorCategory(bill.vendor?.chosenShopStyle) === segmentFilter;

            return matchesSearch && matchesStatus && matchesSegment;
        });
    }, [bills, debouncedSearch, statusFilter, segmentFilter]);

    // Get status badge styling
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'paid': 'bg-green-100 text-green-800 hover:bg-green-100',
            'pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            'overdue': 'bg-red-100 text-red-800 hover:bg-red-100'
        };

        return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    };

    // Function to get month name from number
    const getMonthName = (month: number) => {
        const date = new Date();
        date.setMonth(month - 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Bills Overview</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search by vendor or bill ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] rounded-sm bg-white">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] rounded-sm bg-white">
                        <SelectValue placeholder="Filter by segment" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Segments</SelectItem>
                        <SelectItem value="Gold">Gold</SelectItem>
                        <SelectItem value="Silver">Silver</SelectItem>
                        <SelectItem value="Raw">Raw</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
                <Table>
                    <TableHeader className="bg-[#F7F3F2]">
                        <TableRow>
                            <TableHead className="font-medium text-[#44312D]">Vendor</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Bill ID</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Period</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Rent</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Commission</TableHead>
                            <TableHead className="font-medium text-[#44312D]">CR</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Total Amount</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Due Date</TableHead>
                            <TableHead className="font-medium text-[#44312D]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBills.map((bill: any) => (
                            <TableRow key={bill._id} className="border-b border-gray-100">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {bill.vendor?.logo && (
                                            <img
                                                src={bill.vendor.logo}
                                                alt={bill.vendor.name}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        )}
                                        <div>
                                            <div>{bill.vendor?.name || 'Unknown Vendor'}</div>
                                            <div className="text-xs text-gray-500">{getVendorCategory(bill.vendor?.chosenShopStyle) || 'N/A'}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{bill._id}</TableCell>
                                <TableCell>{getMonthName(bill.month)} {bill.year}</TableCell>
                                <TableCell>{formatCurrency(bill.rent)}</TableCell>
                                <TableCell>{formatCurrency(bill.commission)}</TableCell>
                                <TableCell>{bill.commissionPercentage}%</TableCell>
                                <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                                <TableCell>{formatDate(bill.dueDate)}</TableCell>
                                <TableCell>
                                    <Badge className={getStatusBadge(bill.status)}>
                                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredBills.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                    No bills found matching the current filters
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
} 