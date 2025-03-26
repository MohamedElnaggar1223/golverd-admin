'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Define the type for a notification
export interface Notification {
    _id: string;
    title: string;
    message: string;
    read: boolean;
    sender: {
        _id: string;
        name: string;
        profilePicture?: string;
    };
    createdAt: string;
}

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

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

export default function NotificationProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sseConnected, setSseConnected] = useState(false);
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [lastReconnectTime, setLastReconnectTime] = useState(0);

    // Use refs to track the event source and reconnection attempts
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadNotifications = async () => {
        if (!session?.user) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            setNotifications(data.notifications);

            // Count unread notifications
            const unreadCount = data.notifications.filter((n: Notification) => !n.read).length;
            setUnreadCount(unreadCount);
        } catch (err: any) {
            console.error('Error loading notifications:', err);
            setError(err.message || 'An error occurred');
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const connectSSE = () => {
        // Clean up any existing connection first
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (!session?.user?.email || status !== 'authenticated') {
            console.log('Cannot connect SSE: Not authenticated');
            return;
        }

        try {
            // Create a new SSE connection
            const sse = new EventSource('/api/sse');
            eventSourceRef.current = sse;

            // Connection opened
            sse.onopen = () => {
                console.log('SSE connection opened');
                setSseConnected(true);
                setError(null);
                setReconnectAttempts(0); // Reset reconnect attempts on successful connection
            };

            // Handle messages
            sse.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('SSE message received:', data);

                    // Handle different message types
                    switch (data.type) {
                        case 'connected':
                            console.log('SSE connected with ID:', data.connectionId);
                            setConnectionId(data.connectionId);
                            setSseConnected(true);
                            setError(null);
                            break;

                        case 'notification':
                            // Add new notification to the list
                            const newNotification = data.data;
                            setNotifications(prev => [newNotification, ...prev]);

                            // Increment unread count
                            setUnreadCount(prev => prev + 1);

                            // Show toast notification
                            // toast(
                            //     <div>
                            //         <p className="font-semibold">{newNotification.title}</p>
                            //         <p className="text-sm">{newNotification.message}</p>
                            //     </div>,
                            //     {
                            //         duration: 5000,
                            //         position: 'top-right',
                            //     }
                            // );
                            toast(newNotification.title, {
                                description: newNotification.message,
                                descriptionClassName: "description-class",
                                classNames: {
                                    title: "title-class",
                                    description: "description-class"
                                }
                            });
                            break;

                        case 'unreadCount':
                            // Update unread count
                            setUnreadCount(data.data);
                            break;

                        case 'heartbeat':
                            // Heartbeat received, connection still alive
                            // console.log('SSE heartbeat received:', data.timestamp);
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
                const now = Date.now();

                // If it's been more than 2 minutes since last reconnect attempt, reset counter
                if (now - lastReconnectTime > 120000) {
                    setReconnectAttempts(0);
                }

                if (reconnectAttempts < maxAttempts) {
                    const nextAttempt = Math.min(reconnectAttempts + 1, maxAttempts);
                    setReconnectAttempts(nextAttempt);

                    // Calculate backoff time: 2^attempt * 1000ms, capped at 30s
                    const backoffTime = Math.min(Math.pow(2, nextAttempt) * 1000, 30000);

                    console.log(`SSE: Will attempt reconnect in ${backoffTime / 1000}s (attempt ${nextAttempt}/${maxAttempts})`);

                    // Clear any existing timeout
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current);
                    }

                    // Set new timeout for reconnect
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setLastReconnectTime(Date.now());
                        connectSSE();
                    }, backoffTime);
                } else {
                    console.log('SSE: Max reconnect attempts reached. Manual reconnect required.');
                    setError('Connection lost. Please reconnect manually.');
                }
            };
        } catch (err: any) {
            console.error('Error setting up SSE connection:', err);
            setError(err.message || 'Failed to connect to notification service');
            setSseConnected(false);
        }
    };

    const reconnectSSE = () => {
        // Reset reconnect state
        setReconnectAttempts(0);
        setLastReconnectTime(Date.now());

        // Attempt to reconnect
        connectSSE();
    };

    // Effect to load notifications when session changes
    useEffect(() => {
        if (session?.user) {
            loadNotifications();
        } else {
            // Reset state if user is not authenticated
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [session]);

    // Effect to connect to SSE when session is available
    useEffect(() => {
        if (session?.user && status === 'authenticated') {
            connectSSE();
        }

        // Cleanup function
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [session, status]);

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

            // Update local state
            setNotifications(prevNotifications =>
                prevNotifications.map(notification =>
                    notification._id === notificationId
                        ? { ...notification, read: true }
                        : notification
                )
            );

            // Decrement unread count (server will also send updated count via SSE)
            setUnreadCount(prev => Math.max(0, prev - 1));
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

            // Set unread count to 0
            setUnreadCount(0);
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