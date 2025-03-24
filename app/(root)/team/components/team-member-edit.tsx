'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPositions, getTeamMemberById, updateTeamMember, deleteTeamMember } from "@/lib/actions/team-actions";
import { getVendors } from "@/lib/actions/vendor-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, Loader2, ArrowLeft, Trash2, AlertTriangle, CheckCircle, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";
import { TeamMember } from "@/lib/types/teams.types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const teamMemberFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional(),
    positionId: z.string().min(1, "Position is required"),
    profilePicture: z.string().optional(),
    accountsManaged: z.array(z.string()).optional(),
});

export function TeamMemberEdit({ id }: { id: string }) {
    const router = useRouter();
    const queryClient = getQueryClient()
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [ranOnce, setRanOnce] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [managedVendorIds, setManagedVendorIds] = useState<string[]>([]);
    const [addVendorDialogOpen, setAddVendorDialogOpen] = useState(false);

    const teamMembers = queryClient.getQueryData(['team-members']) as TeamMember[]

    const { data: teamMember, isLoading: isTeamMemberLoading } = useQuery({
        queryKey: ['team-member', id],
        queryFn: async () => {
            const foundTeamMember = teamMembers?.find((member) => member?._id === id)
            if (!foundTeamMember) {
                const data = await getTeamMemberById(id)
                return data
            }
            return foundTeamMember
        },
    });

    const { data: positions } = useSuspenseQuery({
        queryKey: ['positions'],
        queryFn: getPositions
    });

    // Fetch ALL vendors from the database
    const { data: allVendors = [] } = useSuspenseQuery({
        queryKey: ['vendors'],
        queryFn: getVendors
    });

    // Derived state: get managed vendors as objects
    const managedVendors = allVendors.filter((vendor: any) =>
        managedVendorIds.includes(vendor._id)
    );

    // Derived state: get unmanaged vendors (for adding)
    const unmanagedVendors = allVendors.filter((vendor: any) =>
        !managedVendorIds.includes(vendor._id)
    );

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['team-member', id] })
    }, [teamMembers, id, queryClient]);

    const updateTeamMemberMutation = useMutation({
        mutationFn: (data: any) => updateTeamMember(id, data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            queryClient.invalidateQueries({ queryKey: ['team-member', id] });
        },
        onSuccess: () => {
            toast("Team member updated", {
                description: "The team member has been updated successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            router.push('/team');
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to update team member",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    const deleteTeamMemberMutation = useMutation({
        mutationFn: () => deleteTeamMember(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            queryClient.invalidateQueries({ queryKey: ['team-member', id] });
        },
        onSuccess: () => {
            toast("Team member deleted", {
                description: "The team member has been deleted successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            router.push('/team');
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to delete team member",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    // Form for editing a team member
    const form = useForm<z.infer<typeof teamMemberFormSchema>>({
        resolver: zodResolver(teamMemberFormSchema),
        defaultValues: {
            name: teamMember?.name || "",
            email: teamMember?.email || "",
            password: undefined,
            positionId: teamMember?.positionId || "",
            profilePicture: teamMember?.profilePicture || "",
            accountsManaged: managedVendorIds,
        }
    });

    // Initialize form values when teamMember data is available
    useEffect(() => {
        if (teamMember && !isTeamMemberLoading) {
            form.reset({
                name: teamMember.name,
                email: teamMember.email,
                password: undefined,
                positionId: teamMember.position._id,
                profilePicture: teamMember.profilePicture || "",
                accountsManaged: teamMember.accountsManaged || [],
            });

            if (teamMember.profilePicture) {
                setPreviewImage(teamMember.profilePicture);
            }

            if (teamMember.accountsManaged) {
                setManagedVendorIds(teamMember.accountsManaged);
            }

            setRanOnce(true);
        }
    }, [teamMember, form, isTeamMemberLoading]);

    const onSubmit = (values: z.infer<typeof teamMemberFormSchema>) => {
        // Remove password if it's empty
        const data = { ...values };
        if (!data.password) {
            delete data.password;
        }

        // Ensure accountsManaged is included from state
        data.accountsManaged = managedVendorIds;

        updateTeamMemberMutation.mutate(data);
    };

    const addVendorToManaged = (vendorId: string) => {
        setManagedVendorIds(prev => [...prev, vendorId]);
        setAddVendorDialogOpen(false);
    };

    const removeVendorFromManaged = (vendorId: string) => {
        setManagedVendorIds(prev => prev.filter(id => id !== vendorId));
    };

    const handleDelete = () => {
        deleteTeamMemberMutation.mutate();
    };

    // Handle image upload
    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingImage(true);

            // Create a preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Create form data for upload
            const formData = new FormData();
            formData.append("file", file);

            // Upload to API
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload image");
            }

            const data = await response.json();
            form.setValue("profilePicture", data.url);

            toast("Image uploaded", {
                description: "Profile picture uploaded successfully",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                },
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
        } catch (error: any) {
            toast("Upload failed", {
                description: error.message || "Failed to upload image",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                },
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        } finally {
            setUploadingImage(false);
        }
    }, [form]);

    if (!teamMember) {
        return <div>Team member not found</div>;
    }

    return (
        <>
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/team" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Team
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Team Member</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/3 flex flex-col items-center">
                                    <div className="mb-4">
                                        <Avatar className="w-32 h-32 border">
                                            {previewImage ? (
                                                <AvatarImage src={previewImage} alt="Preview" />
                                            ) : (
                                                form.watch("profilePicture") ? (
                                                    <AvatarImage src={form.watch("profilePicture")} alt="Profile" />
                                                ) : (
                                                    <AvatarFallback className="text-3xl">
                                                        {form.watch("name") ?
                                                            form.watch("name").split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) :
                                                            'TM'}
                                                    </AvatarFallback>
                                                )
                                            )}
                                        </Avatar>
                                    </div>

                                    <div className="relative">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex items-center gap-2"
                                            disabled={uploadingImage}
                                        >
                                            {uploadingImage ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <ImagePlus className="h-4 w-4" />
                                                    Change Image
                                                </>
                                            )}
                                        </Button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                        />
                                    </div>
                                </div>

                                <div className="md:w-2/3 space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" type="email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Leave blank to keep current password" type="password" {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormDescription>
                                                    Only enter a new password if you want to change it
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="positionId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Position</FormLabel>
                                                <Select
                                                    onValueChange={ranOnce ? field.onChange : () => { }}
                                                    value={field.value || ""}
                                                    defaultValue={field.value || ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a position" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {positions?.map((position: any) => (
                                                            <SelectItem key={position._id} value={position._id}>
                                                                {position.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-3">
                                        <FormLabel>Vendors Managed</FormLabel>
                                        <FormDescription>
                                            Select the vendors this team member can manage
                                        </FormDescription>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {/* Display managed vendors */}
                                            {managedVendors.map((vendor: any) => (
                                                <div key={vendor._id} className="flex flex-col items-center">
                                                    <div className="relative">
                                                        <Avatar className="h-16 w-16 border">
                                                            {vendor.logo ? (
                                                                <AvatarImage src={vendor.logo} alt={vendor.name} />
                                                            ) : (
                                                                <AvatarFallback className="text-lg">
                                                                    {vendor.name?.substring(0, 2).toUpperCase() || 'VN'}
                                                                </AvatarFallback>
                                                            )}
                                                        </Avatar>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVendorFromManaged(vendor._id)}
                                                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                                        >
                                                            <X className="h-3 w-3 text-white" />
                                                        </button>
                                                    </div>
                                                    <span className="mt-2 text-sm font-medium text-center line-clamp-2">
                                                        {vendor.name}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Add vendor button */}
                                            <Dialog open={addVendorDialogOpen} onOpenChange={setAddVendorDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <div className="flex flex-col items-center cursor-pointer">
                                                        <div className="h-16 w-16 rounded-full border border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
                                                            <Plus className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                        <span className="mt-2 text-sm font-medium text-gray-500">
                                                            Add Vendor
                                                        </span>
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>Add Vendor</DialogTitle>
                                                        <DialogDescription>
                                                            Select a vendor to add to the list of managed vendors.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 max-h-[50vh] overflow-y-auto p-1">
                                                        {unmanagedVendors.length > 0 ? (
                                                            unmanagedVendors.map((vendor: any) => (
                                                                <div
                                                                    key={vendor._id}
                                                                    className="flex flex-col items-center cursor-pointer hover:bg-gray-100 rounded-md p-2 transition-colors"
                                                                    onClick={() => addVendorToManaged(vendor._id)}
                                                                >
                                                                    <Avatar className="h-16 w-16 border">
                                                                        {vendor.logo ? (
                                                                            <AvatarImage src={vendor.logo} alt={vendor.name} />
                                                                        ) : (
                                                                            <AvatarFallback className="text-lg">
                                                                                {vendor.name?.substring(0, 2).toUpperCase() || 'VN'}
                                                                            </AvatarFallback>
                                                                        )}
                                                                    </Avatar>
                                                                    <span className="mt-2 text-sm font-medium text-center line-clamp-2">
                                                                        {vendor.name}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                                                                No additional vendors available to add
                                                            </p>
                                                        )}
                                                    </div>
                                                    <DialogFooter className="sm:justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => setAddVendorDialogOpen(false)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
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
                                            Delete Team Member
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete Team Member</DialogTitle>
                                            <DialogDescription>
                                                Are you sure you want to delete this team member? This action cannot be undone.
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
                                                disabled={deleteTeamMemberMutation.isPending}
                                            >
                                                {deleteTeamMemberMutation.isPending ? (
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
                                        onClick={() => router.push('/team')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={updateTeamMemberMutation.isPending}
                                    >
                                        {updateTeamMemberMutation.isPending ? (
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
        </>
    );
} 