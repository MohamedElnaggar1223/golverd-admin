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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    const router = useRouter();
    const queryClient = getQueryClient()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<any>(null);

    const { data: positions } = useSuspenseQuery({
        queryKey: ['positions'],
        queryFn: getPositions
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

    function handleDeletePosition(position: any) {
        setCurrentPosition(position);
        setIsDeleteDialogOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    asChild
                    className="flex items-center gap-1"
                >
                    <Link href="/team/create-position">
                        <Plus className="h-4 w-4" />
                        Add Position
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {positions?.map((position: any) => (
                    <Card key={position._id} className="overflow-hidden rounded-[4px] w-fit min-w-[370px] py-4">
                        <CardHeader className="pb-0 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarFallback className='bg-[#E8E4E1]'>
                                            {position.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium">{position.name}</h3>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm font-medium">Allowed Access</p>
                                    <p className="text-sm text-black">
                                        {Object.entries(position.permissions)
                                            .filter(([_, value]) => value === true)
                                            .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
                                            .slice(0, 1)[0] || 'No Access'}
                                        {Object.entries(position.permissions).filter(([_, value]) => value === true).length > 1 &&
                                            <span className="text-gray-500 ml-1">+{Object.entries(position.permissions).filter(([_, value]) => value === true).length - 1} more</span>
                                        }
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] hover:bg-[#2A1C1B] hover:text-white text-white"
                                    >
                                        <Link href={`/team/edit-position/${position._id}`}>
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeletePosition(position)}
                                        className="rounded-[4px] px-4 py-5"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {positions?.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No positions found. Add a position to get started.
                    </div>
                )}
            </div>

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