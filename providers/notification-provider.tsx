'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
    connectionId: string | null;
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
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear any existing timeouts when unmounting
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // Initialize SSE connection
    useEffect(() => {
        if (status === 'authenticated' && session?.user?.email) {
            console.log('Authentication detected, connecting to SSE...');
            connectSSE();
            loadNotifications();

            // Clean up on unmount
            return () => {
                console.log('Component unmounting, disconnecting SSE...');
                disconnectSSE();
            };
        } else if (status === 'unauthenticated') {
            console.log('User is not authenticated, no SSE connection');
            disconnectSSE();
        }
    }, [status, session]);

    const connectSSE = () => {
        // Clean up existing connection first
        disconnectSSE();

        try {
            console.log('Creating new SSE connection...');

            // Create new SSE connection with unique cache-busting parameter
            const timestamp = new Date().getTime();
            const sse = new EventSource(`/api/sse?t=${timestamp}`);
            eventSourceRef.current = sse;

            // Connection opened
            sse.onopen = () => {
                console.log('SSE connection opened');
                setSseConnected(true);
                setError(null);
                setReconnectAttempts(0);
                toast.success('Connected to notification service', { id: 'sse-connection' });
            };

            // Handle messages
            sse.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE message received:', data);

                    switch (data.type) {
                        case 'connection':
                            setSseConnected(true);
                            setConnectionId(data.connectionId);
                            console.log('SSE connected with ID:', data.connectionId);
                            break;

                        case 'notification':
                            // Add new notification to the list
                            setNotifications(prev => [data.data, ...prev]);
                            // Increment unread count
                            setUnreadCount(prev => prev + 1);

                            // Show toast notification
                            toast.info(data.data.title, {
                                description: data.data.message,
                                action: {
                                    label: 'View',
                                    onClick: () => loadNotifications()
                                }
                            });

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
                setConnectionId(null);

                // Close connection
                sse.close();
                eventSourceRef.current = null;

                // Implement exponential backoff for reconnection
                const maxAttempts = 10;
                if (reconnectAttempts < maxAttempts) {
                    const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                    console.log(`Reconnecting in ${backoffTime / 1000} seconds (attempt ${reconnectAttempts + 1}/${maxAttempts})`);

                    // Clear any existing timeout
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }

                    // Set new timeout
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setReconnectAttempts(prev => prev + 1);
                        connectSSE();
                    }, backoffTime);
                } else {
                    console.error('Maximum reconnection attempts reached');
                    toast.error('Failed to reconnect to notification service', {
                        description: 'Please refresh the page',
                        id: 'sse-reconnect-failure',
                        action: {
                            label: 'Retry',
                            onClick: () => {
                                setReconnectAttempts(0);
                                connectSSE();
                            }
                        }
                    });
                }
            };

        } catch (err) {
            console.error('Failed to initialize SSE:', err);
            setSseConnected(false);
            setConnectionId(null);
            setError('Failed to connect to notification service');
            toast.error('Failed to connect to notification service', { id: 'sse-init-error' });
        }
    };

    const disconnectSSE = () => {
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        // Close the EventSource if it exists
        if (eventSourceRef.current) {
            console.log('Closing existing SSE connection...');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            setSseConnected(false);
            setConnectionId(null);
        }
    };

    const reconnectSSE = () => {
        toast.info('Reconnecting to notification service...', { id: 'sse-reconnect' });
        disconnectSSE();
        setReconnectAttempts(0);
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
                connectionId,
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