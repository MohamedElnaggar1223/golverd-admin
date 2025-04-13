'use client';

import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getVendors } from "@/lib/actions/vendor-actions";
import { formatCurrency } from "@/lib/utils";
import { getVendorCategory } from "@/lib/vendor-utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useRouter } from "next/navigation";

export function VendorsTab() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [segmentFilter, setSegmentFilter] = useState('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Fetch vendors from prefetched data
    const { data: vendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    // Filter vendors based on search and segment filters
    const filteredVendors = useMemo(() => {
        return vendors.filter((vendor: any) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                vendor.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                vendor._id?.toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply segment filter
            const matchesSegment = segmentFilter === 'all' ||
                getVendorCategory(vendor.chosenShopStyle) === segmentFilter;

            return matchesSearch && matchesSegment;
        });
    }, [vendors, debouncedSearch, segmentFilter]);

    // Navigate to vendor finance detail page
    const navigateToVendorDetail = (vendorId: string) => {
        router.push(`/finance/vendor/${vendorId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search vendors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVendors.map((vendor: any) => (
                    <Card
                        key={vendor._id}
                        className="border border-gray-200 hover:border-[#44312D] transition-all cursor-pointer"
                        onClick={() => navigateToVendorDetail(vendor._id)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                {vendor.logo ? (
                                    <img
                                        src={vendor.logo}
                                        alt={vendor.name}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-[#F7F3F2] flex items-center justify-center text-[#44312D] font-semibold">
                                        {vendor.name?.substring(0, 2).toUpperCase() || "VN"}
                                    </div>
                                )}
                                <div>
                                    <div className="font-semibold">{vendor.name}</div>
                                    <div className="text-sm text-gray-500">
                                        {getVendorCategory(vendor.chosenShopStyle) || 'No category'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 mt-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Monthly Rent:</span>
                                    <span>{formatCurrency(vendor.rent || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Commission Rate:</span>
                                    <span>{vendor.commission || 0}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Active Since:</span>
                                    <span>
                                        {vendor.activationDate
                                            ? new Date(vendor.activationDate).toLocaleDateString()
                                            : 'Not activated'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredVendors.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No vendors found matching the current filters
                    </div>
                )}
            </div>
        </div>
    );
} 