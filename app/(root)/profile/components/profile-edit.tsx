'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPositions, getTeamMemberById, updateTeamMember } from "@/lib/actions/team-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner";
import { TeamMember } from "@/lib/types/teams.types";
import { formatDistanceToNow } from "date-fns";

const profileFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().optional(),
    positionId: z.string().min(1, "Position is required"),
    profilePicture: z.string().optional(),
});

export function ProfileEdit({ id }: { id: string }) {
    const router = useRouter();
    const queryClient = getQueryClient()
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [ranOnce, setRanOnce] = useState(false);

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

    useEffect(() => {
        queryClient.invalidateQueries({ queryKey: ['team-member', id] })
    }, [teamMembers, id, queryClient]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: any) => updateTeamMember(id, data),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
            queryClient.invalidateQueries({ queryKey: ['team-member', id] });
        },
        onSuccess: () => {
            toast("Profile updated", {
                description: "Your profile has been updated successfully.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to update profile",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    // Form for editing profile
    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: teamMember?.name || "",
            email: teamMember?.email || "",
            password: undefined,
            positionId: teamMember?.positionId || "",
            profilePicture: teamMember?.profilePicture || "",
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
            });

            if (teamMember.profilePicture) {
                setPreviewImage(teamMember.profilePicture);
            }

            setRanOnce(true);
        }
    }, [teamMember, form, isTeamMemberLoading]);

    const onSubmit = (values: z.infer<typeof profileFormSchema>) => {
        // Remove password if it's empty
        const data = { ...values };
        if (!data.password) {
            delete data.password;
        }

        updateProfileMutation.mutate(data);
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
        return <div>Profile not found</div>;
    }

    return (
        <div className="w-full px-6 py-6">
            <h1 className="text-2xl font-bold mb-6">Edit Your Profile</h1>
            <div className="mb-6">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
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
                                                            'ME'}
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
                                                    disabled
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
                                                    Your position in the organization (can only be changed by an administrator)
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-[4px] px-4 py-5 bg-gray-200 min-w-[180px] text-black"
                                    onClick={() => router.push('/')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] min-w-[180px] text-white"
                                    disabled={updateProfileMutation.isPending}
                                >
                                    {updateProfileMutation.isPending ? (
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