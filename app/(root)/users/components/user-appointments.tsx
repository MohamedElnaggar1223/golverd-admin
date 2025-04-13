'use client';

import { useMemo, useState } from 'react';
import { getUserAppointments, toggleAppointmentSaleStatus } from '@/lib/actions/user-actions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
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
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/shared/spinner';
import { Search, Calendar } from 'lucide-react';
import { IAppointment } from '@/models/Appointment';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
interface UserAppointmentsProps {
    selectedUserId: string | null;
}

// Type for a lean appointment document
type LeanAppointment = Omit<IAppointment, 'branchInfo'> & {
    branchInfo: Record<string, any>;
    _id: string;
    __v: number;
};

export default function UserAppointments({ selectedUserId }: UserAppointmentsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = getQueryClient();

    // Fetch appointments
    const appointmentsQuery = useQuery({
        queryKey: ['appointments', selectedUserId],
        queryFn: () => selectedUserId ? getUserAppointments(selectedUserId) : Promise.resolve([]),
        enabled: !!selectedUserId,
    });

    // Sale status toggle mutation
    const saleStatusMutation = useMutation({
        mutationFn: toggleAppointmentSaleStatus,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments', selectedUserId] });
        },
        onSuccess: () => {
            toast.success('Sale status updated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update sale status: ${error.message}`);
        }
    });

    // Extract branch name from appointment
    const getBranchName = (appointment: LeanAppointment): string => {
        // Use branch field if available
        if (appointment.branch) return appointment.branch;

        // Otherwise try to extract from branchInfo.address
        if (appointment.branchInfo?.address) {
            const addressParts = appointment.branchInfo.address.split(',');
            return addressParts[0].trim();
        }

        return 'N/A';
    };

    // Filter appointments based on search
    const filteredAppointments = useMemo(() => {
        if (!appointmentsQuery.data) return [];

        if (!debouncedSearch.trim()) return appointmentsQuery.data;

        const search = debouncedSearch.toLowerCase();
        return appointmentsQuery.data.filter((appointment: LeanAppointment) =>
            appointment.vendorName?.toLowerCase().includes(search) ||
            appointment.status?.toLowerCase().includes(search) ||
            getBranchName(appointment).toLowerCase().includes(search)
        );
    }, [appointmentsQuery.data, debouncedSearch]);

    // Status badge styling
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'upcoming': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
            'completed': 'bg-green-100 text-green-800 hover:bg-green-100',
            'cancelled': 'bg-red-100 text-red-800 hover:bg-red-100',
            'pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        };

        return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    };

    // Handle toggle sale status
    const handleToggleSaleStatus = (appointmentId: string) => {
        saleStatusMutation.mutate(appointmentId);
    };

    if (!selectedUserId) {
        return (
            <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
                <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                    <CardTitle className="text-lg font-medium">Appointments</CardTitle>
                </CardHeader>
                <CardContent className="p-6 min-h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                        Select a user to view their appointments
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
            <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                <CardTitle className="text-lg font-medium">Appointments</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search appointments..."
                        className="pl-8 rounded-[4px] pr-4 py-5 bg-[#E8E4E1] border border-[#44312D]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {appointmentsQuery.isLoading ? (
                    <div className="flex justify-center items-center min-h-[300px]">
                        <Spinner size="lg" />
                    </div>
                ) : appointmentsQuery.isError ? (
                    <div className="flex justify-center items-center min-h-[300px] text-red-500">
                        Error loading appointments
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <p>No appointments found</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        <Table>
                            <TableHeader className="bg-[#F7F3F2]">
                                <TableRow>
                                    <TableHead className="font-medium text-[#44312D]">Vendor</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Branch</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Date & Time</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Status</TableHead>
                                    <TableHead className="font-medium text-[#44312D]">Sale Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAppointments.map((appointment: LeanAppointment) => (
                                    <TableRow key={appointment._id} className="border-b border-gray-100">
                                        <TableCell>{appointment.vendorName || 'N/A'}</TableCell>
                                        <TableCell>{getBranchName(appointment)}</TableCell>
                                        <TableCell className="py-3">
                                            {formatDate(appointment.date, 'MM/dd/yyyy')}
                                            {appointment.time ? ` • ${appointment.time}` : ''}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-normal rounded-sm ${getStatusBadge(appointment.status)}`}>
                                                {appointment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">
                                                    {appointment.saleStatus || 'No Sale'}
                                                </span>
                                                <Switch
                                                    checked={appointment.saleStatus === 'Sold'}
                                                    onCheckedChange={() => handleToggleSaleStatus(appointment._id)}
                                                    disabled={saleStatusMutation.isPending}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
} 