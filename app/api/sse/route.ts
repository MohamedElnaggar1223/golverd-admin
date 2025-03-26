import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registerConnection, unregisterConnection, getAllConnections } from '@/lib/actions/notifications-actions';
import { v4 as uuidv4 } from 'uuid';

// Define proper types for ReadableStream controller
type Controller = ReadableStreamDefaultController<Uint8Array>;

// Force this route to run on the server in a persistent environment
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs'; // Use Node.js runtime
export const preferredRegion = 'auto';

export async function GET(req: NextRequest) {
    // Get current user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        console.error('SSE: Unauthorized connection attempt');
        return new Response('Unauthorized', { status: 401 });
    }

    // Create a unique connection ID for this session
    const connectionId = uuidv4();

    // Log connection attempt
    console.log(`SSE: New connection request from ${session.user.email} with ID ${connectionId}`);

    // Debug: Print all current connections before adding this one
    const connections = await getAllConnections();
    console.log(`SSE: Current connections before adding new one: ${connections.userCount} users, ${connections.connectionCount} total connections`);

    // Stream setup
    const encoder = new TextEncoder();

    // Store references for cleanup
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let closed = false;

    const stream = new ReadableStream({
        start: async (controller) => {
            try {
                // Register this connection when the stream starts
                await registerConnection(
                    session.user.email as string,
                    controller,
                    connectionId
                );

                console.log(`SSE: Connection established for ${session.user.email} with ID ${connectionId}`);

                // Send initial heartbeat to confirm connection
                const initialMessage = {
                    type: 'connected',
                    message: 'Connected to notification service',
                    connectionId,
                    timestamp: new Date().toISOString()
                };

                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
                );

                // Start heartbeat interval (every 30 seconds)
                heartbeatInterval = setInterval(() => {
                    try {
                        // Skip sending heartbeat if connection is already closed
                        if (closed) {
                            if (heartbeatInterval) {
                                clearInterval(heartbeatInterval);
                                heartbeatInterval = null;
                            }
                            return;
                        }

                        const heartbeat = {
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        };

                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`)
                        );
                    } catch (error) {
                        // If we can't send heartbeat, connection may be closed
                        console.error(`SSE: Heartbeat failed for ${session.user.email}:`, error);

                        // Mark as closed to prevent further attempts
                        closed = true;

                        // Clean up on error
                        if (heartbeatInterval) {
                            clearInterval(heartbeatInterval);
                            heartbeatInterval = null;
                        }

                        // Unregister the connection since it's no longer valid
                        unregisterConnection(
                            session.user.email as string,
                            connectionId
                        ).catch(err => {
                            console.error(`SSE: Error unregistering connection on heartbeat failure:`, err);
                        });
                    }
                }, 30000);
            } catch (error) {
                console.error(`SSE: Error during start for ${session.user.email}:`, error);
                controller.error(error);
            }
        },
        cancel: async () => {
            // Mark as closed
            closed = true;

            // Clean up interval on cancellation
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }

            // Clean up this connection when the client disconnects
            try {
                await unregisterConnection(
                    session.user.email as string,
                    connectionId
                );
                console.log(`SSE: Connection closed for ${session.user.email} with ID ${connectionId}`);
            } catch (error) {
                console.error(`SSE: Error unregistering connection on cancel:`, error);
            }
        }
    });

    // Return the stream as an SSE response
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Disable buffering for Nginx
        },
    });
}