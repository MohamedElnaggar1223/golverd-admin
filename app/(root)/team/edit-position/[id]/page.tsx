'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getPositions, getPositionById, updatePosition, deletePosition } from "@/lib/actions/team-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, use } from "react";
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

const positionFormSchema = z.object({
    name: z.string().min(1, "Position name is required"),
    permissions: z.object({
        viewAll: z.boolean().default(false),
        viewDashboard: z.boolean().default(true),
        viewTeamMembers: z.boolean().default(false),
        viewVendors: z.boolean().default(false),
        viewOrders: z.boolean().default(false),
        viewAppointments: z.boolean().default(false),
        viewFinancialCenter: z.boolean().default(false),
        viewUsers: z.boolean().default(false),
        editAll: z.boolean().default(false),
        editTeamMembers: z.boolean().default(false),
        editVendors: z.boolean().default(false),
        editOrders: z.boolean().default(false),
        editAppointments: z.boolean().default(false),
        editFinancialCenter: z.boolean().default(false),
    })
});

export default function EditPositionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    const router = useRouter();
    const queryClient = getQueryClient();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ranOnce, setRanOnce] = useState(false);

    const positions = queryClient.getQueryData(['positions']) as any[];

    const { data: position, isLoading: isPositionLoading } = useQuery({
        queryKey: ['position', id],
        queryFn: async () => {
            const foundPosition = positions?.find((pos) => pos?._id === id);
            if (!foundPosition) {
                const data = await getPositionById(id);
                return data;
            }
            return foundPosition;
        },
    });

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['position', id] });
    }, [positions, id, queryClient]);

    const updatePositionMutation = useMutation({
        mutationFn: (data: any) => updatePosition(id, data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['position', id] });
        },
        onSuccess: () => {
            toast("Position updated", {
                description: "The position has been updated successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            router.push('/team?tab=positions');
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to update position",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    const deletePositionMutation = useMutation({
        mutationFn: () => deletePosition(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['position', id] });
        },
        onSuccess: () => {
            toast("Position deleted", {
                description: "The position has been deleted successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            router.push('/team?tab=positions');
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to delete position",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    const form = useForm<z.infer<typeof positionFormSchema>>({
        resolver: zodResolver(positionFormSchema),
        defaultValues: {
            name: position?.name || "",
            permissions: {
                viewAll: false,
                viewDashboard: true,
                viewTeamMembers: false,
                viewVendors: false,
                viewOrders: false,
                viewAppointments: false,
                viewFinancialCenter: false,
                viewUsers: false,
                editAll: false,
                editTeamMembers: false,
                editVendors: false,
                editOrders: false,
                editAppointments: false,
                editFinancialCenter: false,
            }
        }
    });

    useEffect(() => {
        if (position && !isPositionLoading) {
            form.reset({
                name: position.name,
                permissions: {
                    ...position.permissions
                }
            });
            setRanOnce(true);
        }
    }, [position, form, isPositionLoading]);

    const onSubmit = (values: z.infer<typeof positionFormSchema>) => {
        updatePositionMutation.mutate(values);
    };

    const handleDelete = () => {
        deletePositionMutation.mutate();
    };

    if (!position) {
        return <div>Position not found</div>;
    }

    return (
        <div className="w-full px-6 py-6">
            <h1 className="text-2xl font-bold mb-6">Edit "{position.name}" Position</h1>
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/team?tab=positions" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Positions
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Position Title</FormLabel>
                                            <FormControl>
                                                <Input className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]' placeholder="e.g., Manager" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium">Access Control</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <FormField
                                            control={form.control}
                                            name="permissions.viewAll"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View All</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewDashboard"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Dashboard</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewTeamMembers"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Team Members</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewVendors"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Vendors</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewOrders"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Orders</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewAppointments"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Appointments</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewFinancialCenter"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Financial Center</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.viewUsers"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">View Users</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editAll"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit All</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editTeamMembers"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit Team Members</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editVendors"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit Vendors</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editOrders"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit Orders</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editAppointments"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit Appointments</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="permissions.editFinancialCenter"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center space-x-2 space-y-0 px-4 py-2 bg-gray-200 justify-between">
                                                    <FormLabel className="font-normal text-sm">Edit Financial Center</FormLabel>
                                                    <FormControl>
                                                        <Checkbox
                                                            className='data-[state=checked]:bg-[#44312D] data-[state=checked]:text-white bg-white'
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-3">
                                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="flex items-center gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete Position
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete Position</DialogTitle>
                                            <DialogDescription>
                                                Are you sure you want to delete this position? This action cannot be undone.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() => setDeleteDialogOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleDelete}
                                                disabled={deletePositionMutation.isPending}
                                            >
                                                {deletePositionMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Deleting...
                                                    </>
                                                ) : (
                                                    'Delete'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <div className="flex gap-3 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-[4px] px-4 py-5 bg-gray-200 lg:min-w-[280px] text-black"
                                        onClick={() => router.push('/team?tab=positions')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] lg:min-w-[280px] text-white"
                                        disabled={updatePositionMutation.isPending}
                                    >
                                        {updatePositionMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
} 