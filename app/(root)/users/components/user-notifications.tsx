'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sendUserNotification, getUserNotifications, markNotificationAsRead } from '@/lib/actions/user-actions';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    RadioGroup,
    RadioGroupItem
} from '@/components/ui/radio-group';
import { Spinner } from '@/components/shared/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Send, Loader2, Mail, Bell, CheckCircle } from 'lucide-react';

interface UserNotificationsProps {
    selectedUserId: string | null;
    selectedUserName: string | null;
}

// Form validation schema
const notificationSchema = z.object({
    title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
    message: z.string().min(5, { message: 'Message must be at least 5 characters long' }),
    recipientType: z.enum(['all', 'selected']),
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function UserNotifications({ selectedUserId, selectedUserName }: UserNotificationsProps) {
    // Initialize form
    const form = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            title: '',
            message: '',
            recipientType: 'selected',
        },
    });

    // Fetch user's notifications
    const notificationsQuery = useQuery({
        queryKey: ['notifications', selectedUserId],
        queryFn: () => selectedUserId ? getUserNotifications(selectedUserId) : Promise.resolve([]),
        enabled: !!selectedUserId,
    });

    // Notification mutation
    const notificationMutation = useMutation({
        mutationFn: sendUserNotification,
        onSuccess: (data) => {
            toast.success(data.message);
            form.reset();
        },
        onError: (error: Error) => {
            toast.error(`Failed to send notification: ${error.message}`);
        },
    });

    // Mark notification as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => markNotificationAsRead(id),
        onSuccess: () => {
            toast.success('Notification marked as read');
            notificationsQuery.refetch();
        },
        onError: (error: Error) => {
            toast.error(`Failed to mark as read: ${error.message}`);
        },
    });

    const onSubmit = (data: NotificationFormValues) => {
        // Prepare notification data
        const notificationData = {
            title: data.title,
            message: data.message,
            userId: data.recipientType === 'selected' ? selectedUserId || '' : undefined,
            sendToAll: data.recipientType === 'all'
        };

        // Validate that user is selected if sending to specific user
        if (data.recipientType === 'selected' && !selectedUserId) {
            toast.error('Please select a user from the list first');
            return;
        }

        // Send notification
        notificationMutation.mutate(notificationData);
    };

    // Handle marking notification as read
    const handleMarkAsRead = (notificationId: string) => {
        markAsReadMutation.mutate(notificationId);
    };

    if (!selectedUserId) {
        return (
            <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
                <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                    <CardTitle className="text-lg font-medium">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="p-6 min-h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                        Select a user to manage notifications
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-[4px] overflow-hidden shadow-sm border border-gray-200">
            <CardHeader className="px-6 py-4 bg-white border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                <CardTitle className="text-lg font-medium">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="recipientType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-sm font-medium">Send to</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-1"
                                        >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="selected" id="selected-user" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer" htmlFor="selected-user">
                                                    Selected User: {selectedUserName || "None selected"}
                                                </FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="all" id="all-users" />
                                                </FormControl>
                                                <FormLabel className="font-normal cursor-pointer" htmlFor="all-users">
                                                    All Users
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">Notification Title</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                className='pl-10 rounded-[4px] pr-4 py-5 bg-[#E8E4E1] border border-[#44312D]'
                                                placeholder="Enter notification title"
                                                {...field}
                                            />
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium">Notification Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className='rounded-[4px] px-4 py-3 min-h-[100px] bg-[#E8E4E1] border border-[#44312D]'
                                            placeholder="Enter notification message"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] text-white min-w-[140px]"
                                disabled={notificationMutation.isPending}
                            >
                                {notificationMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Send
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
} 