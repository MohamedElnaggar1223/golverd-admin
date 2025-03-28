'use client';

import { useState, useMemo } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, toggleAppointmentSaleStatus } from "@/lib/actions/appointment-actions";
import { formatDate, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/shared/spinner";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle } from "lucide-react";
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

interface VendorAppointmentsTabProps {
    vendorId: string;
}

export function VendorAppointmentsTab({ vendorId }: VendorAppointmentsTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('all'); // all, upcoming, cancelled
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = useQueryClient();

    // Fetch all appointments
    const { data: allAppointments = [] } = useSuspenseQuery({
        queryKey: ['appointments'],
        queryFn: getAppointments
    });

    // Filter appointments by vendor ID
    const vendorAppointments = useMemo(() => {
        return allAppointments.filter((appointment: any) =>
            appointment.vendorID?._id === vendorId || appointment.vendorID === vendorId
        );
    }, [allAppointments, vendorId]);

    // Calculate monthly appointment data for chart
    const monthlyAppointmentData = useMemo(() => {
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const data = months.map(month => ({ name: month, appointments: 0 }));

        vendorAppointments.forEach((appointment) => {
            console.log("appointment", appointment._id)
            if (appointment.date) {
                const appointmentDate = new Date(appointment.date);
                if (appointmentDate.getFullYear() === selectedYear) {
                    const monthIndex = appointmentDate.getMonth();
                    data[monthIndex].appointments += 1;
                }
            }
        });

        return data;
    }, [vendorAppointments, selectedYear]);

    // Toggle accordion state
    const toggleAccordion = (appointmentId: string) => {
        setExpandedAccordions(prev => ({
            ...prev,
            [appointmentId]: !prev[appointmentId]
        }));
    };

    // Filter appointments based on search and time
    const filteredAppointments = useMemo(() => {
        if (!vendorAppointments) return [];

        return vendorAppointments.filter((appointment: any) => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                (appointment.customerName || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.customerPhone || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.serviceType || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                (appointment.saleStatus || '').toLowerCase().includes(debouncedSearch.toLowerCase());

            let matchesTime = true;
            if (timeFilter !== 'all') {
                if (timeFilter === 'upcoming') {
                    matchesTime = appointment.status === 'upcoming';
                } else if (timeFilter === 'cancelled') {
                    matchesTime = appointment.status === 'cancelled';
                }
            }

            return matchesSearch && matchesTime;
        });
    }, [vendorAppointments, debouncedSearch, timeFilter]);

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
            toast("Sale status updated", {
                description: "The appointment has been updated successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to update appointment",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    // Get product initials for avatar fallback
    const getProductInitials = (name: string): string => {
        if (!name) return "P";
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
                    <CardTitle className="text-lg font-medium">Monthly Appointments</CardTitle>
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
                                data={monthlyAppointmentData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="appointments"
                                    stroke="#82ca9d"
                                    activeDot={{ r: 8 }}
                                    name="Appointments"
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
                        placeholder="Search appointments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
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

            <ScrollArea className="h-[calc(100vh-600px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAppointments.map((appointment: any) => {
                        const appointmentDate = new Date(appointment.date);

                        const isExpanded = expandedAccordions[appointment._id] || false;

                        // Ensure branch data is properly accessed
                        const branch = appointment.branch ||
                            (appointment.branchID && appointment.branchID.name) ||
                            'Main Branch';

                        return (
                            <Card key={appointment._id} className="overflow-hidden rounded-[4px] w-fit min-w-[370px] py-4 h-fit">
                                <CardHeader className="pb-0 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <h3 className="font-medium">{branch}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {appointmentDate
                                                        ? formatDate(appointmentDate.toString(), 'MM/dd/yyyy')
                                                        : 'Unknown Date'
                                                    }
                                                </p>
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
                                                        {appointmentDate
                                                            ? formatDate(appointmentDate.toString(), 'MM/dd/yyyy')
                                                            : 'Unknown Date'
                                                        }
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