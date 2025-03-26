'use server';

import { connectDB } from '@/lib/mongoose';
import Notification from '@/models/Notification';
import { ConnectionStore } from '@/lib/connection-store';
import SuperUser from '@/models/SuperUser';

// Create our connection storage - in-memory singleton
// This manages all active SSE connections
const connectionStore = new ConnectionStore();

/**
 * Gets all active connections for superusers and users
 */
export async function getAllConnections() {
    return connectionStore.getAllConnections();
}

/**
 * Register a new SSE connection for a user or superuser
 */
export async function registerConnection(userId: string, controller: ReadableStreamDefaultController, connectionId: string) {
    connectionStore.registerConnection(userId.toLowerCase(), controller, connectionId);
}

/**
 * Unregister a SSE connection
 */
export async function unregisterConnection(userId: string, connectionId: string) {
    connectionStore.unregisterConnection(userId.toLowerCase(), connectionId);
}

/**
 * Gets number of active connections for a user 
 */
export async function getConnectionCount(userId: string): Promise<number> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();
    return userConnections.get(normalizedUserId)?.size || 0;
}

/**
 * Send a notification to a user through their SSE connection
 * Also saves notification to database if saveToDb is true
 */
export async function sendNotification(
    userId: string,
    notificationData: {
        title: string;
        message: string;
        sender: {
            _id: string;
            name: string;
        };
        createdAt: string;
        read: boolean;
    }
): Promise<boolean> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();

    const userConnectionMap = userConnections.get(normalizedUserId);
    if (!userConnectionMap || userConnectionMap.size === 0) {
        console.log(`SSE: No active connections for user ${normalizedUserId} when sending notification`);
        // We'll still create DB record if needed even if user isn't connected
    }

    // If user is connected, send notification via SSE
    if (userConnectionMap && userConnectionMap.size > 0) {
        const data = JSON.stringify({
            type: 'notification',
            data: notificationData
        });

        const encodedData = new TextEncoder().encode(`data: ${data}\n\n`);
        let successCount = 0;
        let failedConnections = [];

        // Send to all connections for this user
        for (const [connId, connectionInfo] of userConnectionMap.entries()) {
            try {
                connectionInfo.controller.enqueue(encodedData);
                successCount++;
            } catch (error) {
                console.error(`SSE: Error sending notification to user ${normalizedUserId} connection ${connectionInfo.id.substring(0, 8)}...:`, error);
                // Track failed connections for removal
                failedConnections.push(connId);
            }
        }

        // Remove failed connections
        for (const connId of failedConnections) {
            userConnectionMap.delete(connId);
        }

        if (successCount > 0) {
            return true;
        } else if (failedConnections.length > 0) {
            // If all connections failed, clean up
            if (userConnectionMap.size === 0) {
                userConnections.delete(normalizedUserId);
            }
        }
    }

    return false;
}

/**
 * Updates the unread count for a user through all their SSE connections
 */
export async function updateUnreadCount(userId: string, count: number): Promise<boolean> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();

    const userConnectionMap = userConnections.get(normalizedUserId);
    if (!userConnectionMap || userConnectionMap.size === 0) {
        console.log(`SSE: No active connections for user ${normalizedUserId} when updating unread count`);
        return false;
    }

    const data = JSON.stringify({
        type: 'unreadCount',
        data: count
    });

    const encodedData = new TextEncoder().encode(`data: ${data}\n\n`);
    let successCount = 0;
    let failedConnections = [];

    // Send to all connections for this user
    for (const [connId, connectionInfo] of userConnectionMap.entries()) {
        try {
            connectionInfo.controller.enqueue(encodedData);
            successCount++;
        } catch (error) {
            console.error(`SSE: Error sending unread count to user ${normalizedUserId} connection ${connectionInfo.id.substring(0, 8)}...:`, error);
            // Track failed connections for removal
            failedConnections.push(connId);
        }
    }

    // Remove failed connections
    for (const connId of failedConnections) {
        userConnectionMap.delete(connId);
    }

    if (successCount > 0) {
        return true;
    } else if (failedConnections.length > 0) {
        // If all connections failed, clean up
        if (userConnectionMap.size === 0) {
            userConnections.delete(normalizedUserId);
        }
    }

    return false;
}

/**
 * Create a notification for a superuser
 */
export async function createSuperUserNotification(data: {
    recipientId: string,
    senderId: string,
    title: string,
    message: string
}): Promise<boolean> {
    try {
        await connectDB();

        const notification = new Notification({
            recipient: data.recipientId,
            recipientType: 'superuser',
            sender: data.senderId,
            senderType: 'superuser',
            title: data.title,
            message: data.message,
            read: false
        });

        await notification.save();

        // Get recipient for SSE notification
        const recipient = await SuperUser.findById(data.recipientId, 'email');
        if (recipient?.email) {
            await sendNotification(recipient.email, {
                title: data.title,
                message: data.message,
                sender: {
                    _id: data.senderId,
                    name: 'Admin', // Default name if sender details not provided
                },
                createdAt: new Date().toISOString(),
                read: false,
            });

            // Update unread count
            const count = await Notification.countDocuments({
                recipient: data.recipientId,
                recipientType: 'superuser',
                read: false
            });
            await updateUnreadCount(recipient.email, count);
        }

        return true;
    } catch (error) {
        console.error('Error creating superuser notification:', error);
        return false;
    }
}

/**
 * Gets notifications for a superuser
 */
export async function getSuperUserNotifications(superUserId: string) {
    await connectDB();

    const notifications = await Notification.find({
        recipient: superUserId,
        recipientType: 'superuser'
    })
        .sort({ createdAt: -1 })
        .lean();

    return notifications;
}

/**
 * Gets unread notification count for a superuser
 */
export async function getSuperUserUnreadCount(superUserId: string) {
    await connectDB();

    const count = await Notification.countDocuments({
        recipient: superUserId,
        recipientType: 'superuser',
        read: false
    });

    return { count };
}

/**
 * Mark a superuser notification as read
 */
export async function markSuperUserNotificationAsRead(notificationId: string) {
    await connectDB();

    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new Error('Notification not found');
    }

    if (notification.recipientType !== 'superuser') {
        throw new Error('Not a superuser notification');
    }

    // Mark as read
    notification.read = true;
    await notification.save();

    // Update unread count for real-time UI update
    // Get superuser email to update unread count through SSE
    const superUser = await SuperUser.findById(notification.recipient);
    if (superUser?.email) {
        // Get updated count
        const count = await Notification.countDocuments({
            recipient: notification.recipient,
            recipientType: 'superuser',
            read: false
        });

        // Send unread count update via SSE
        await updateUnreadCount(superUser.email, count);
    }

    return { success: true };
} 