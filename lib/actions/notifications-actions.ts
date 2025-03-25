'use server';

import { v4 as uuidv4 } from 'uuid';
import { cache } from 'react';

// Define types at module level so they're accessible everywhere
type Controller = ReadableStreamDefaultController<Uint8Array>;
type ConnectionInfo = {
    id: string;
    controller: Controller;
    createdAt: Date;
};

// Create a persistent singleton for connection state
// Using a closure to keep state isolated between module reloads
const createConnectionStore = () => {
    // Global map to store active user connections
    const userConnections = new Map<string, Map<string, ConnectionInfo>>();

    return {
        getUserConnections: () => userConnections,
        getConnectionCount: () => {
            let count = 0;
            userConnections.forEach(connections => {
                count += connections.size;
            });
            return count;
        }
    };
};

// Create singleton store
const connectionStore = createConnectionStore();

/**
 * Debug function to log all active connections
 */
function logAllConnections() {
    const userConnections = connectionStore.getUserConnections();
    console.log('=== SSE CONNECTION DEBUG ===');
    console.log(`Total users connected: ${userConnections.size}`);
    console.log(`Total active connections: ${connectionStore.getConnectionCount()}`);

    userConnections.forEach((connections, userId) => {
        console.log(`User ${userId}: ${connections.size} connections`);
        connections.forEach((info, connId) => {
            console.log(`  - Connection ${connId.substring(0, 8)}... created at ${info.createdAt.toISOString()}`);
        });
    });
    console.log('=== END CONNECTION DEBUG ===');
}

/**
 * Registers a new SSE connection for a user and returns the connection ID
 */
export async function registerConnection(userId: string, controller: Controller): Promise<string> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();

    // Initialize user's connection map if needed
    if (!userConnections.has(normalizedUserId)) {
        userConnections.set(normalizedUserId, new Map());
    }

    // Generate a unique connection ID
    const connectionId = uuidv4();
    const connectionInfo: ConnectionInfo = {
        id: connectionId,
        controller,
        createdAt: new Date()
    };

    // Add to user's connections
    userConnections.get(normalizedUserId)?.set(connectionId, connectionInfo);

    const activeConnections = userConnections.get(normalizedUserId)?.size || 0;
    console.log(`SSE: User ${normalizedUserId} connected (${activeConnections} active connections)`);

    // Log all connections for debugging
    logAllConnections();

    return connectionId;
}

/**
 * Unregisters an SSE connection for a user
 */
export async function unregisterConnection(userId: string, connectionId: string): Promise<void> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();

    const userConnectionMap = userConnections.get(normalizedUserId);
    if (!userConnectionMap) {
        console.log(`SSE: No connections found for user ${normalizedUserId} when trying to unregister`);
        return;
    }

    // Remove this specific connection
    userConnectionMap.delete(connectionId);

    // Clean up user entry if no more connections
    if (userConnectionMap.size === 0) {
        userConnections.delete(normalizedUserId);
        console.log(`SSE: User ${normalizedUserId} - all connections closed`);
    } else {
        console.log(`SSE: User ${normalizedUserId} - connection ${connectionId.substring(0, 8)}... closed (${userConnectionMap.size} connections remaining)`);
    }

    // Log all connections for debugging
    logAllConnections();
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
 * Sends a notification to a specific user through all their SSE connections
 */
export async function sendNotification(userId: string, notification: any): Promise<boolean> {
    const userConnections = connectionStore.getUserConnections();

    // Convert userId to lowercase for case-insensitive matching
    const normalizedUserId = userId.toLowerCase();

    const userConnectionMap = userConnections.get(normalizedUserId);
    if (!userConnectionMap || userConnectionMap.size === 0) {
        console.log(`SSE: No active connections for user ${normalizedUserId}`);
        logAllConnections();
        return false;
    }

    const data = JSON.stringify({
        type: 'notification',
        data: notification
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
            console.error(`SSE: Error sending to user ${normalizedUserId} connection ${connectionInfo.id.substring(0, 8)}...:`, error);
            // Track failed connections for removal
            failedConnections.push(connId);
        }
    }

    // Remove failed connections
    for (const connId of failedConnections) {
        userConnectionMap.delete(connId);
    }

    if (successCount > 0) {
        console.log(`SSE: Notification sent to ${successCount}/${userConnectionMap.size} connections for user ${normalizedUserId}`);
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