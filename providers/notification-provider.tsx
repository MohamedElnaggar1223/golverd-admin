'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

type Notification = {
    _id: string;
    title: string;
    message: string;
    sender: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
    createdAt: string;
    read: boolean;
};

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    sseConnected: boolean;
    loadNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    reconnectSSE: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export default function NotificationProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sseConnected, setSseConnected] = useState(false);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    // Initialize SSE connection
    useEffect(() => {
        if (status === 'authenticated' && session?.user?.id) {
            connectSSE();
            loadNotifications();

            // Clean up on unmount
            return () => {
                disconnectSSE();
            };
        }
    }, [status, session]);

    const connectSSE = () => {
        if (eventSource) {
            eventSource.close();
        }

        try {
            // Create new SSE connection
            const sse = new EventSource('/api/sse');
            setEventSource(sse);

            // Connection opened
            sse.onopen = () => {
                console.log('SSE connection opened');
                setSseConnected(true);
                setError(null);
            };

            // Handle messages
            sse.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE message received:', data);

                    switch (data.type) {
                        case 'connection':
                            setSseConnected(true);
                            console.log('SSE connected:', data.message);
                            break;

                        case 'notification':
                            // Add new notification to the list
                            setNotifications(prev => [data.data, ...prev]);
                            // Increment unread count
                            setUnreadCount(prev => prev + 1);

                            // Show browser notification if allowed
                            if ('Notification' in window && Notification.permission === 'granted') {
                                const { title, message, sender } = data.data;
                                new Notification(title, {
                                    body: message,
                                    icon: sender.profilePicture || '/favicon.ico',
                                });
                            }
                            break;

                        case 'unreadCount':
                            // Update unread count
                            setUnreadCount(data.data);
                            break;

                        default:
                            console.warn('Unknown SSE message type:', data.type);
                    }
                } catch (err) {
                    console.error('Error parsing SSE message:', err, event.data);
                }
            };

            // Error handling
            sse.onerror = (err) => {
                console.error('SSE connection error:', err);
                setSseConnected(false);
                setError('Lost connection to notification service');

                // Close and retry connection after a delay
                sse.close();
                setTimeout(() => {
                    connectSSE();
                }, 5000);
            };

        } catch (err) {
            console.error('Failed to initialize SSE:', err);
            setSseConnected(false);
            setError('Failed to connect to notification service');
        }
    };

    const disconnectSSE = () => {
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
            setSseConnected(false);
        }
    };

    const reconnectSSE = () => {
        disconnectSSE();
        connectSSE();
    };

    // Request notification permissions
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            console.error('Error loading notifications:', err);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationId }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            // Update local state (server will send updated count via SSE)
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification._id === notificationId
                        ? { ...notification, read: true }
                        : notification
                )
            );
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            console.error('Error marking notification as read:', err);
            toast.error('Failed to mark notification as read');
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ markAllRead: true }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }

            // Update local state (server will send updated count via SSE)
            setNotifications(prevNotifications =>
                prevNotifications.map(notification => ({ ...notification, read: true }))
            );
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            console.error('Error marking all notifications as read:', err);
            toast.error('Failed to mark all notifications as read');
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                error,
                sseConnected,
                loadNotifications,
                markAsRead,
                markAllAsRead,
                reconnectSSE,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
} 