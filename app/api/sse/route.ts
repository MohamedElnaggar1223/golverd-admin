import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registerConnection, unregisterConnection } from '@/lib/actions/notifications-actions';

// Define proper types for ReadableStream controller
type Controller = ReadableStreamDefaultController<Uint8Array>;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    let controller: Controller;

    // Create a stream for Server-Sent Events
    const stream = new ReadableStream({
        start(ctrl) {
            // Save controller reference
            controller = ctrl;

            // Register this connection
            registerConnection(userId, controller);

            // Send initial connection message
            const data = JSON.stringify({ type: 'connection', message: 'Connected to notifications' });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));

            console.log(`SSE: User ${userId} connected`);
        },
        cancel() {
            // Unregister this connection using the saved reference
            if (controller) {
                unregisterConnection(userId, controller);
            }
            console.log(`SSE: User ${userId} disconnected`);
        }
    });

    // Return the stream as an event stream
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}