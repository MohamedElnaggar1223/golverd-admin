import { v4 as uuidv4 } from 'uuid';

// Controller type for ReadableStream
export type Controller = ReadableStreamDefaultController<Uint8Array>;

// Connection info type
export type ConnectionInfo = {
    id: string;
    controller: Controller;
    createdAt: Date;
};

/**
 * Connection store to manage SSE connections
 * Implemented as a singleton to maintain state between module reloads
 */
export class ConnectionStore {
    private userConnections: Map<string, Map<string, ConnectionInfo>>;

    constructor() {
        // Global map to store active user connections
        this.userConnections = new Map<string, Map<string, ConnectionInfo>>();
    }

    /**
     * Get all active user connections
     */
    getUserConnections(): Map<string, Map<string, ConnectionInfo>> {
        return this.userConnections;
    }

    /**
     * Get all connections information
     */
    getAllConnections(): { userCount: number, connectionCount: number } {
        let connectionCount = 0;
        this.userConnections.forEach(connections => {
            connectionCount += connections.size;
        });

        return {
            userCount: this.userConnections.size,
            connectionCount
        };
    }

    /**
     * Register a new connection for a user
     */
    registerConnection(userId: string, controller: Controller, connectionId: string = uuidv4()): string {
        // Convert userId to lowercase for case-insensitive matching
        const normalizedUserId = userId.toLowerCase();

        // Initialize user's connection map if needed
        if (!this.userConnections.has(normalizedUserId)) {
            this.userConnections.set(normalizedUserId, new Map());
        }

        // Add to user's connections
        const connectionInfo: ConnectionInfo = {
            id: connectionId,
            controller,
            createdAt: new Date()
        };
        this.userConnections.get(normalizedUserId)?.set(connectionId, connectionInfo);

        console.log(`SSE: User ${normalizedUserId} connected (${this.userConnections.get(normalizedUserId)?.size || 0} active connections)`);
        return connectionId;
    }

    /**
     * Unregister a connection for a user
     */
    unregisterConnection(userId: string, connectionId: string): void {
        // Convert userId to lowercase for case-insensitive matching
        const normalizedUserId = userId.toLowerCase();

        const userConnectionMap = this.userConnections.get(normalizedUserId);
        if (!userConnectionMap) {
            console.log(`SSE: No connections found for user ${normalizedUserId} when trying to unregister`);
            return;
        }

        // Remove this specific connection
        userConnectionMap.delete(connectionId);

        // Clean up user entry if no more connections
        if (userConnectionMap.size === 0) {
            this.userConnections.delete(normalizedUserId);
            console.log(`SSE: User ${normalizedUserId} - all connections closed`);
        } else {
            console.log(`SSE: User ${normalizedUserId} - connection ${connectionId.substring(0, 8)}... closed (${userConnectionMap.size} connections remaining)`);
        }
    }

    /**
     * Debug function to log all active connections
     */
    logAllConnections(): void {
        console.log('=== SSE CONNECTION DEBUG ===');
        console.log(`Total users connected: ${this.userConnections.size}`);

        let totalConnections = 0;
        this.userConnections.forEach(connections => {
            totalConnections += connections.size;
        });
        console.log(`Total active connections: ${totalConnections}`);

        this.userConnections.forEach((connections, userId) => {
            console.log(`User ${userId}: ${connections.size} connections`);
            connections.forEach((info, connId) => {
                console.log(`  - Connection ${connId.substring(0, 8)}... created at ${info.createdAt.toISOString()}`);
            });
        });
        console.log('=== END CONNECTION DEBUG ===');
    }
} 