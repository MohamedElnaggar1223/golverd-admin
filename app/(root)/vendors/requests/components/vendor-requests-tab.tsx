'use client';

import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approveVendor, getVendors, rejectVendor } from "@/lib/actions/vendor-actions";
import { filterVendorRequests } from "@/lib/vendor-utils";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/shared/spinner";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Input } from '@/components/ui/input'

const approveVendorSchema = z.object({
    rent: z.coerce.number().min(0, "Rent must be a positive number"),
    commission: z.coerce.number().min(0, "Commission must be a positive number").max(100, "Commission cannot exceed 100%"),
    activationDate: z.date({
        required_error: "Activation date is required",
    }),
});

export function VendorRequestsTab() {
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [selectedVendorName, setSelectedVendorName] = useState<string>('');
    const queryClient = useQueryClient();

    // Get all vendors from cache and filter for requests client-side
    const { data: allVendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: () => getVendors()  // Data is loaded from HydrationBoundary
    });

    const vendorRequests = filterVendorRequests(allVendors);

    // Form for approving vendor
    const form = useForm<z.infer<typeof approveVendorSchema>>({
        resolver: zodResolver(approveVendorSchema),
        defaultValues: {
            rent: 0,
            commission: 0,
            activationDate: new Date(),
        },
    });

    // Mutations for approve and reject
    const approveMutation = useMutation({
        mutationFn: (data: { id: string, formData: z.infer<typeof approveVendorSchema> }) =>
            approveVendor(data.id, data.formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            toast("Vendor approved", {
                description: "The vendor has been approved successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setApproveDialogOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to approve vendor",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    const rejectMutation = useMutation({
        mutationFn: (id: string) => rejectVendor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            toast("Vendor rejected", {
                description: "The vendor has been rejected.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setRejectDialogOpen(false);
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to reject vendor",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    // Handle approve button click
    const handleApproveClick = (vendorId: string) => {
        const vendor = vendorRequests.find(v => v._id === vendorId);
        setSelectedVendorId(vendorId);
        setSelectedVendorName(vendor?.name || 'this vendor');
        setApproveDialogOpen(true);
    };

    // Handle reject button click
    const handleRejectClick = (vendorId: string) => {
        const vendor = vendorRequests.find(v => v._id === vendorId);
        setSelectedVendorId(vendorId);
        setSelectedVendorName(vendor?.name || 'this vendor');
        setRejectDialogOpen(true);
    };

    // Handle approve form submission
    const onApproveSubmit = (values: z.infer<typeof approveVendorSchema>) => {
        if (selectedVendorId) {
            approveMutation.mutate({
                id: selectedVendorId,
                formData: values
            });
        }
    };

    // Handle reject confirmation
    const handleRejectConfirm = () => {
        if (selectedVendorId) {
            rejectMutation.mutate(selectedVendorId);
        }
    };

    return (
        <div className="space-y-6">
            <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vendorRequests.map((vendor) => (
                        <Card key={vendor._id} className="overflow-hidden rounded-[4px] w-full">
                            <CardHeader className="pb-0 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                <div className='w-full flex items-center justify-end space-x-1'>
                                    {/* <p className="text-sm font-medium">Requested</p> */}
                                    <p className="text-sm text-gray-500">
                                        {formatDate(vendor.createdAt, 'MM/dd/yyyy')}
                                    </p>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-16 w-16">
                                            <AvatarImage src={vendor.logo || ''} alt={vendor.name} />
                                            <AvatarFallback className='bg-[#E8E4E1]'>
                                                {vendor.name ? vendor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'VN'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-medium">{vendor.name || 'Unknown Vendor'}</h3>
                                            <p className="text-sm text-gray-500">{vendor.email || 'No email provided'}</p>
                                        </div>
                                    </div>
                                    {/* <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 font-normal rounded-sm">
                                        Pending
                                    </Badge> */}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex justify-evenly gap-6">
                                    <Button
                                        variant="outline"
                                        className="rounded-[4px] flex-1 px-4 py-5 bg-gray-200"
                                        onClick={() => handleRejectClick(vendor._id)}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="rounded-[4px] flex-1 px-4 py-5 bg-[#2A1C1B] hover:bg-[#44312D] text-white"
                                        onClick={() => handleApproveClick(vendor._id)}
                                    >
                                        Accept
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {vendorRequests.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            No pending vendor requests found.
                        </div>
                    )}
                </div>
            </ScrollArea >

            {/* Approve Vendor Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen} >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Approve Vendor</DialogTitle>
                        <DialogDescription>
                            Enter details for {selectedVendorName}'s account approval.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onApproveSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="rent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monthly Rent (EGP)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="0"
                                                className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]'
                                                {...field}
                                                type="number"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="commission"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Commission Percentage (%)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="0"
                                                className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]'
                                                {...field}
                                                type="number"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="activationDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Activation Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn('rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]', !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? (
                                                            formatDate(field.value, "MM/dd/yyyy")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setApproveDialogOpen(false)}
                                    type="button"
                                    className="rounded-[4px] flex-1 px-4 py-5 bg-gray-200"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-[4px] flex-1 px-4 py-5 bg-[#2A1C1B] hover:bg-[#44312D] text-white"
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? (
                                        <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Approving...
                                        </>
                                    ) : (
                                        'Approve Vendor'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Reject Vendor Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen} >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Vendor</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reject {selectedVendorName}'s vendor application?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRejectDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={rejectMutation.isPending}
                        >
                            {rejectMutation.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Rejecting...
                                </>
                            ) : (
                                'Reject Vendor'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}