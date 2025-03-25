'use server';

// Global map to store active user connections
type Controller = ReadableStreamDefaultController<Uint8Array>;
const userConnections = new Map<string, Set<Controller>>();

/**
 * Registers a new SSE connection for a user
 */
export async function registerConnection(userId: string, controller: Controller) {
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
    }
    userConnections.get(userId)?.add(controller);
    console.log(`SSE: User ${userId} connected (${userConnections.get(userId)?.size || 0} connections)`);
}

/**
 * Unregisters an SSE connection for a user
 */
export async function unregisterConnection(userId: string, controller: Controller) {
    const connections = userConnections.get(userId);
    if (connections) {
        connections.delete(controller);
        if (connections.size === 0) {
            userConnections.delete(userId);
        }
        console.log(`SSE: User ${userId} disconnected (${connections.size} connections remaining)`);
    }
}

/**
 * Sends a notification to a specific user through SSE
 */
export async function sendNotification(userId: string, notification: any) {
    const connections = userConnections.get(userId);
    if (!connections || connections.size === 0) {
        console.log(`SSE: No active connections for user ${userId}`);
        return false;
    }

    const data = JSON.stringify({
        type: 'notification',
        data: notification
    });

    // Send to all connections for this user
    for (const controller of connections) {
        try {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        } catch (error) {
            console.error(`SSE: Error sending to user ${userId}:`, error);
        }
    }

    console.log(`SSE: Notification sent to user ${userId}`);
    return true;
}

/**
 * Updates the unread count for a user through SSE
 */
export async function updateUnreadCount(userId: string, count: number) {
    const connections = userConnections.get(userId);
    if (!connections || connections.size === 0) {
        return false;
    }

    const data = JSON.stringify({
        type: 'unreadCount',
        data: count
    });

    // Send to all connections for this user
    for (const controller of connections) {
        try {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        } catch (error) {
            console.error(`SSE: Error sending unread count to user ${userId}:`, error);
        }
    }

    return true;
} 