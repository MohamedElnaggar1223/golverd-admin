'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeamMember, getPositions } from "@/lib/actions/team-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { getQueryClient } from "@/lib/get-query-client";
import { toast } from "sonner"

const teamMemberFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    positionId: z.string().min(1, "Position is required"),
    profilePicture: z.string().optional(),
    accountsManaged: z.array(z.string()).optional(),
});

export function NewTeamMemberTab() {
    const queryClient = getQueryClient()
    const [uploadingImage, setUploadingImage] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Fetch positions
    const { data: positions } = useSuspenseQuery({
        queryKey: ['positions'],
        queryFn: getPositions
    });

    // Create team member mutation
    const createTeamMemberMutation = useMutation({
        mutationFn: createTeamMember,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members'] });
        },
        onSuccess: () => {
            toast("Team member created", {
                description: "The team member has been created successfully.",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
            form.reset();
            setPreviewImage(null);
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to create team member",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        }
    });

    // Form for adding a new team member
    const form = useForm<z.infer<typeof teamMemberFormSchema>>({
        resolver: zodResolver(teamMemberFormSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            positionId: "",
            profilePicture: "",
            accountsManaged: [],
        }
    });

    const onSubmit = (values: z.infer<typeof teamMemberFormSchema>) => {
        createTeamMemberMutation.mutate(values);
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
                }
            });
        } catch (error: any) {
            toast("Upload failed", {
                description: error.message || "Failed to upload image",
                descriptionClassName: "description-class",
                classNames: {
                    title: "title-class",
                    description: "description-class"
                }
            });
        } finally {
            setUploadingImage(false);
        }
    }, [form, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add New Team Member</CardTitle>
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
                                                Upload Image
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
                                                <Input className='rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]' placeholder="********" type="password" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Must be at least 8 characters
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
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="rounded-[4px] px-4 py-5 bg-[#E8E4E1] border border-[#44312D]">
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
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] lg:min-w-[280px] text-white"
                                disabled={createTeamMemberMutation.isPending}
                            >
                                {createTeamMemberMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    'Add Team Member'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
} 