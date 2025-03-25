import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registerConnection, unregisterConnection } from '@/lib/actions/notifications-actions';

// Define proper types for ReadableStream controller
type Controller = ReadableStreamDefaultController<Uint8Array>;

// Force this route to run on the server in a persistent environment
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime
export const preferredRegion = 'auto';

export async function GET(req: NextRequest) {
    // Get user session
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session?.user?.email) {
        console.log('SSE: Unauthorized connection attempt');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user identifier (email)
    const userId = session.user.email;
    console.log(`SSE: Connection request from user ${userId}`);

    // Connection ID will be set in the start method
    let connectionId: string;
    // Store heartbeat interval reference for cleanup
    let heartbeatInterval: NodeJS.Timeout;

    // Create a stream for Server-Sent Events
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Register this connection and get a connection ID
                connectionId = await registerConnection(userId, controller);

                // Send initial connection message
                const data = JSON.stringify({
                    type: 'connection',
                    message: 'Connected to notifications',
                    connectionId
                });
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));

                // Send heartbeat every 30 seconds to keep connection alive
                heartbeatInterval = setInterval(() => {
                    try {
                        controller.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
                    } catch (error) {
                        console.error('SSE: Error sending heartbeat:', error);
                        clearInterval(heartbeatInterval);
                    }
                }, 30000);

            } catch (error) {
                console.error('SSE: Error in start method:', error);
                controller.error('Internal Server Error');
            }
        },
        async cancel() {
            try {
                // Clear any heartbeat interval
                if (heartbeatInterval) {
                    clearInterval(heartbeatInterval);
                }

                // Unregister this specific connection using its ID
                await unregisterConnection(userId, connectionId);
                console.log(`SSE: Connection ${connectionId} cancelled for user ${userId}`);
            } catch (error) {
                console.error('SSE: Error in cancel method:', error);
            }
        }
    });

    // Return the stream as an SSE response with appropriate headers
    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Disable buffering for Nginx
        }
    });
}