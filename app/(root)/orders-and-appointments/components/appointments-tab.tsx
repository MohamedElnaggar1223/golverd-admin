'use client';

import { useState, useMemo } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, toggleAppointmentSaleStatus } from "@/lib/actions/appointment-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { formatDate, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/shared/spinner";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";
export function AppointmentsTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [vendorFilter, setVendorFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all'); // all, upcoming, cancelled
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = getQueryClient();

    // Fetch all appointments
    const { data: appointments = [] } = useSuspenseQuery({
        queryKey: ['appointments'],
        queryFn: getAppointments
    });

    // Fetch all vendors for the filter
    const { data: vendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    // Helper function to format time
    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Toggle accordion state
    const toggleAccordion = (appointmentId: string) => {
        setExpandedAccordions(prev => ({
            ...prev,
            [appointmentId]: !prev[appointmentId]
        }));
    };

    // Filter appointments based on search, vendor, and time
    const filteredAppointments = useMemo(() => {
        if (!appointments) return [];

        return appointments.filter((appointment: any) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                (appointment.customerName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.customerPhone || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.vendorID?.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.serviceType || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.saleStatus || '').toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply vendor filter
            const matchesVendor = vendorFilter === 'all' || appointment.vendorID?._id === vendorFilter;


            let matchesTime = true;
            if (timeFilter !== 'all') {
                if (timeFilter === 'upcoming') {
                    matchesTime = appointment.status === 'upcoming';
                } else if (timeFilter === 'cancelled') {
                    matchesTime = appointment.status === 'cancelled';
                }
            }

            return matchesSearch && matchesVendor && matchesTime;
        });
    }, [appointments, debouncedSearch, vendorFilter, timeFilter]);

    // Mutation for toggling sale status
    const toggleSaleStatusMutation = useMutation({
        mutationFn: async (appointmentId: string) => {
            setIsUpdating(appointmentId);
            try {
                await toggleAppointmentSaleStatus(appointmentId);
            } finally {
                setIsUpdating(null);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success("Sale status updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update sale status. Please check your permissions.");
        }
    });

    // Get vendor initials for avatar fallback
    const getVendorInitials = (name: string): string => {
        if (!name) return "VN";
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    // Get product initials for avatar fallback
    const getProductInitials = (name: string): string => {
        if (!name) return "P";
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search appointments..."
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
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] rounded-sm bg-white">
                        <SelectValue placeholder="Filter by time" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAppointments.map((appointment: any) => {
                        const appointmentDate = appointment.date
                            ? new Date(appointment.date._seconds * 1000)
                            : null;

                        const isExpanded = expandedAccordions[appointment._id] || false;

                        // Ensure vendor data is properly accessed - different field structure
                        const vendorName = appointment.vendorName ||
                            (appointment.vendorID && appointment.vendorID.name) ||
                            'Unknown Vendor';

                        const vendorPicture = vendors.find((vendor: any) => vendor._id === appointment.vendorID)?.logo || '';

                        const branch = appointment.branch ||
                            (appointment.branchID && appointment.branchID.name) ||
                            'Main Branch';

                        // Get products (if available) or create an empty array
                        const products = appointment.products || [];

                        return (
                            <Card key={appointment._id} className="overflow-hidden rounded-[4px] w-fit min-w-[370px] py-4 h-fit">
                                <CardHeader className="pb-0 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage
                                                    src={vendorPicture}
                                                    alt={vendorName}
                                                />
                                                <AvatarFallback className="bg-[#E8E4E1]">
                                                    {getVendorInitials(vendorName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-medium">{vendorName}</h3>
                                                <p className="text-sm text-gray-500">{branch}</p>
                                            </div>
                                        </div>

                                        {appointment.saleStatus?.toLowerCase() !== 'sold' && (
                                            <Button
                                                size="sm"
                                                className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] hover:bg-[#44312D] text-white"
                                                onClick={() => toggleSaleStatusMutation.mutate(appointment._id)}
                                                disabled={isUpdating === appointment._id}
                                            >
                                                {isUpdating === appointment._id ? (
                                                    <Spinner className="h-3 w-3 mr-2" />
                                                ) : null}
                                                Convert to Sale
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4">
                                    <div className="space-y-2">
                                        <div
                                            className="flex justify-between items-center cursor-pointer"
                                            onClick={() => toggleAccordion(appointment._id)}
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{appointment.clientName || 'Unknown Client'}</p>
                                                <p className="text-sm text-gray-500">{appointment.clientNumber || 'No phone number'}</p>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-500" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-500" />
                                            )}
                                        </div>

                                        {isExpanded && (
                                            <div className="pt-3 space-y-4">
                                                <div className="text-sm text-gray-500 flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {formatDate(appointment.date, 'MM/dd/yyyy')}
                                                        {appointment.time ? ` • ${appointment.time}` : ''}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={appointment.productImage} alt={appointment.productName} />
                                                        <AvatarFallback className="bg-[#E8E4E1] text-xs">
                                                            {getProductInitials(appointment.productName)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{appointment.productName}</p>
                                                        {/* <p className="text-xs text-gray-500">{appointment.productCategory || 'Product'}</p> */}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {filteredAppointments.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-gray-500">
                            No appointments found. Try adjusting your search or filter.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
} 