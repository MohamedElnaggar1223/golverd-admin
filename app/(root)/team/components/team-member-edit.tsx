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
import { ImagePlus, Loader2, ArrowLeft, Trash2, AlertTriangle, CheckCircle, X, Plus, Send, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";
import { TeamMember } from "@/lib/types/teams.types";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "react-qr-code";
import { PhoneInput } from "@/components/ui/phone-input";
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
    phoneNumber: z.string().optional(),
    accountsManaged: z.array(z.string()).optional(),
    notification: z.object({
        title: z.string().optional(),
        message: z.string().optional(),
    }).optional(),
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
    const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
    const [qrDialogOpen, setQrDialogOpen] = useState(false);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const profileUrl = `${origin}/public/profile/${id}`;

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

    const sendNotificationMutation = useMutation({
        mutationFn: (data: { title: string, message: string }) => {
            return fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: id,
                    title: data.title,
                    message: data.message,
                }),
            }).then(res => {
                if (!res.ok) {
                    throw new Error('Failed to send notification');
                }
                return res.json();
            });
        },
        onSuccess: () => {
            toast("Notification sent", {
                description: "The notification has been sent successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            setNotificationDialogOpen(false);
        },
        onError: (error: any) => {
            toast("Error", {
                description: "Failed to send notification",
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
            phoneNumber: teamMember?.phoneNumber || "",
            accountsManaged: managedVendorIds,
            notification: {
                title: "",
                message: "",
            }
        }
    });

    // Initialize form values when teamMember data is available
    useEffect(() => {
        if (teamMember && !isTeamMemberLoading) {
            form.reset({
                name: teamMember.name,
                email: teamMember.email,
                password: undefined,
                positionId: teamMember.position?._id,
                profilePicture: teamMember.profilePicture || "",
                phoneNumber: teamMember.phoneNumber || "",
                accountsManaged: teamMember.accountsManaged || [],
                notification: {
                    title: "",
                    message: "",
                }
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

        // Remove notification data
        delete data.notification;

        // Ensure accountsManaged is included from state
        data.accountsManaged = managedVendorIds;

        updateTeamMemberMutation.mutate(data);
    };

    const sendNotification = (e: React.FormEvent) => {
        e.preventDefault();
        const notificationData = form.getValues("notification");

        if (!notificationData?.title || !notificationData?.message) {
            toast("Error", {
                description: "Please provide both title and message for the notification",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
            return;
        }

        sendNotificationMutation.mutate({
            title: notificationData.title!,
            message: notificationData.message!,
        });
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
        <div className="w-full px-6 py-6">
            <h1 className="text-2xl font-bold mb-6">Edit Team Member: {teamMember.name}</h1>
            <div className="mb-6 flex justify-between">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/team" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Team
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                Scan QR Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Team Member QR Code</DialogTitle>
                                <DialogDescription>
                                    Scan this QR code to view {teamMember.name}'s public profile
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center p-6">
                                <div className="bg-white p-4 rounded-md shadow-sm">
                                    <QRCode
                                        size={256}
                                        value={profileUrl}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                                <p className="mt-4 text-sm text-center text-gray-500">
                                    {profileUrl}
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
                            {/* Header Section with Image and Position Info */}
                            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar className="w-24 h-24 border">
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

                                        <div className="absolute -bottom-2 -right-2">
                                            <div className="relative">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="rounded-full h-8 w-8 bg-white shadow-md border-gray-200"
                                                    disabled={uploadingImage}
                                                >
                                                    {uploadingImage ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <ImagePlus className="h-4 w-4" />
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
                                    </div>
                                    <div>
                                        <h3 className="font-medium">{teamMember.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {teamMember.position?.name || 'No Position'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end mt-4 ml-auto md:mt-0">
                                    <div className="flex items-center mb-2">
                                        <p className="text-sm font-medium mr-1">Joined</p>
                                        <p className="text-sm text-gray-500">
                                            {teamMember.createdAt
                                                ? formatDistanceToNow(new Date(teamMember.createdAt), { addSuffix: true })
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="flex items-center gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete Member
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
                                </div>
                            </div>

                            {/* Basic Info Section */}
                            <div className="p-6 space-y-4 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                <h3 className="font-medium">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]' placeholder="John Doe" {...field} />
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
                                                    <Input className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]' placeholder="john@example.com" type="email" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="phoneNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone Number</FormLabel>
                                                <FormControl>
                                                    <PhoneInput
                                                        defaultCountry="EG"
                                                        international
                                                        // withCountryCallingCode
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        className='rounded-[4px]'
                                                    // className="rounded-[4px]  bg-[#E8E4E1] border border-[#44312D]"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the team member's phone number
                                                </FormDescription>
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
                                                    <Input className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]' placeholder="Leave blank to keep current password" type="password" {...field} value={field.value || ''} />
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
                                                        <SelectTrigger className="rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]">
                                                            <SelectValue placeholder="Select a position" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {positions?.map((position: any) => (
                                                            <SelectItem key={position?._id} value={position?._id}>
                                                                {position?.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Select the team member's role in the organization
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Accounts Managed Section */}
                            <div className="p-6 space-y-4 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">Accounts Managed</h3>
                                    <Dialog open={addVendorDialogOpen} onOpenChange={setAddVendorDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full"
                                            >
                                                <Plus className="h-4 w-4 mr-1" />
                                                Add Vendor
                                            </Button>
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

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {managedVendors.length > 0 ? (
                                        managedVendors.map((vendor: any) => (
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
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground col-span-full">
                                            No vendors are currently being managed by this team member.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Send Notification Section */}
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">Send Notification</h3>
                                    <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Send className="h-4 w-4 mr-1" />
                                                Compose Message
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Send Notification to {teamMember.name}</DialogTitle>
                                                <DialogDescription>
                                                    This notification will be sent immediately to the team member.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-2">
                                                <FormField
                                                    control={form.control}
                                                    name="notification.title"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Title</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Notification title" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="notification.message"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Message</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder="Enter your message here"
                                                                    className="min-h-[100px]"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setNotificationDialogOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={sendNotification}
                                                    disabled={sendNotificationMutation.isPending}
                                                >
                                                    {sendNotificationMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        'Send Notification'
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Send a direct notification to this team member. They will receive it immediately on their dashboard and via email.
                                </p>
                            </div>

                            {/* Form Actions */}
                            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-[4px] px-4 py-5 bg-gray-200 min-w-[180px] text-black"
                                    onClick={() => router.push('/team')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] min-w-[180px] text-white"
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
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
} 