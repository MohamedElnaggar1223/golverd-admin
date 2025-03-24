'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createPosition, deletePosition, getPositions, updatePosition } from "@/lib/actions/team-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Edit, Plus, Trash2, Loader2 } from "lucide-react";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";

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

export function PositionsTab() {
    const queryClient = getQueryClient()
    const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
    const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<any>(null);

    const { data: positions } = useSuspenseQuery({
        queryKey: ['positions'],
        queryFn: getPositions
    });

    // Create position mutation
    const createPositionMutation = useMutation({
        mutationFn: createPosition,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
        onSuccess: () => {
            setIsAddPositionOpen(false);
            form.reset();
        }
    });

    // Update position mutation
    const updatePositionMutation = useMutation({
        mutationFn: (data: { id: string; data: any }) =>
            updatePosition(data.id, data.data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
        onSuccess: () => {
            setIsEditPositionOpen(false);
        }
    });

    // Delete position mutation
    const deletePositionMutation = useMutation({
        mutationFn: (id: string) => deletePosition(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
        onSuccess: () => {
            setIsDeleteDialogOpen(false);
        },
        onError: (error: any) => {
            toast("Error deleting position", {
                description: error.message || "Failed to delete position",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    // Form for adding a new position
    const form = useForm<z.infer<typeof positionFormSchema>>({
        resolver: zodResolver(positionFormSchema),
        defaultValues: {
            name: "",
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

    // Form for editing a position
    const editForm = useForm<z.infer<typeof positionFormSchema>>({
        resolver: zodResolver(positionFormSchema),
        defaultValues: {
            name: "",
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

    function onSubmit(values: z.infer<typeof positionFormSchema>) {
        // Directly pass as Record<string, boolean>
        createPositionMutation.mutate(values);
    }

    function onEdit(values: z.infer<typeof positionFormSchema>) {
        if (currentPosition) {
            updatePositionMutation.mutate({
                id: currentPosition._id,
                data: values
            });
        }
    }

    function handleEditPosition(position: any) {
        setCurrentPosition(position);
        editForm.reset({
            name: position.name,
            permissions: {
                ...position.permissions
            }
        });
        setIsEditPositionOpen(true);
    }

    function handleDeletePosition(position: any) {
        setCurrentPosition(position);
        setIsDeleteDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    onClick={() => setIsAddPositionOpen(true)}
                    className="flex items-center gap-1"
                >
                    <Plus className="h-4 w-4" />
                    Add Position
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions?.map((position: any) => (
                    <Card key={position._id}>
                        <CardHeader>
                            <CardTitle>{position.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Permissions:</h4>
                                <ul className="text-sm text-gray-500 space-y-1 pl-5 list-disc">
                                    {position.permissions.viewAll && <li>View All</li>}
                                    {position.permissions.viewDashboard && <li>View Dashboard</li>}
                                    {position.permissions.viewTeamMembers && <li>View Team Members</li>}
                                    {position.permissions.viewVendors && <li>View Vendors</li>}
                                    {position.permissions.viewOrders && <li>View Orders</li>}
                                    {position.permissions.viewAppointments && <li>View Appointments</li>}
                                    {position.permissions.viewFinancialCenter && <li>View Financial Center</li>}
                                    {position.permissions.viewUsers && <li>View Users</li>}
                                    {position.permissions.editAll && <li>Edit All</li>}
                                    {position.permissions.editTeamMembers && <li>Edit Team Members</li>}
                                    {position.permissions.editVendors && <li>Edit Vendors</li>}
                                    {position.permissions.editOrders && <li>Edit Orders</li>}
                                    {position.permissions.editAppointments && <li>Edit Appointments</li>}
                                    {position.permissions.editFinancialCenter && <li>Edit Financial Center</li>}
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPosition(position)}
                            >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePosition(position)}
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {positions?.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No positions found. Add a position to get started.
                    </div>
                )}
            </div>

            {/* Add Position Dialog */}
            <Dialog open={isAddPositionOpen} onOpenChange={setIsAddPositionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Position</DialogTitle>
                        <DialogDescription>
                            Create a new position and set its permissions.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Position Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., Manager" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Permissions</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="permissions.viewAll"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View All</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewDashboard"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Dashboard</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewTeamMembers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Team Members</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewVendors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Vendors</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewOrders"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Orders</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewAppointments"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Appointments</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewFinancialCenter"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Financial Center</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.viewUsers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Users</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editAll"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit All</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editTeamMembers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Team Members</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editVendors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Vendors</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editOrders"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Orders</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editAppointments"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Appointments</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="permissions.editFinancialCenter"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Financial Center</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={createPositionMutation.isPending}
                                >
                                    {createPositionMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Position'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Edit Position Dialog */}
            <Dialog open={isEditPositionOpen} onOpenChange={setIsEditPositionOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Position</DialogTitle>
                        <DialogDescription>
                            Modify the position and its permissions.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-6">
                            <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Position Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., Manager" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Permissions</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewAll"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View All</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewDashboard"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Dashboard</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewTeamMembers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Team Members</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewVendors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Vendors</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewOrders"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Orders</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewAppointments"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Appointments</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewFinancialCenter"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Financial Center</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.viewUsers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">View Users</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editAll"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit All</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editTeamMembers"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Team Members</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editVendors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Vendors</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editOrders"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Orders</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editAppointments"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Appointments</FormLabel>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="permissions.editFinancialCenter"
                                        render={({ field }) => (
                                            <FormItem className="flex items-start space-x-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">Edit Financial Center</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={updatePositionMutation.isPending}
                                >
                                    {updatePositionMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Position'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Position Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Position</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this position? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => currentPosition && deletePositionMutation.mutate(currentPosition._id)}
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
        </div>
    );
} 