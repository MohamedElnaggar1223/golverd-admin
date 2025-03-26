import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';
import SuperUser from '@/models/SuperUser';
import { sendNotification, updateUnreadCount } from '@/lib/actions/notifications-actions';

// Helper function to get unread count for a user
async function getUnreadCount(userId: string, recipientType: 'user' | 'superuser'): Promise<number> {
    await connectDB();
    return await Notification.countDocuments({
        recipient: userId,
        recipientType,
        read: false
    });
}

// GET - Fetch notifications
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await connectDB();

        // Check if user is a SuperUser or regular User
        const email = session.user.email as string;
        let userId: string;
        let recipientType: 'user' | 'superuser';

        // Check if user is a SuperUser
        const superUser = await SuperUser.findOne({ email }).lean();
        if (superUser) {
            userId = superUser._id.toString();
            recipientType = 'superuser';
        } else {
            // Try to find as regular User
            const user = await User.findOne({ email }).lean();
            if (!user) {
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            userId = user._id.toString();
            recipientType = 'user';
        }

        // Parse query parameters
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const skip = parseInt(url.searchParams.get('skip') || '0');
        const onlyUnread = url.searchParams.get('unread') === 'true';

        // Build query
        const query: any = {
            recipient: userId,
            recipientType
        };

        if (onlyUnread) {
            query.read = false;
        }

        // Fetch notifications
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const total = await Notification.countDocuments(query);

        return new Response(JSON.stringify({
            notifications,
            pagination: {
                total,
                limit,
                skip
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// POST handler for creating a notification
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await connectDB();
        const { title, message, recipientId } = await req.json();

        if (!recipientId || !title || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // IMPORTANT: Check if we have the recipient's email
        // If not, we need to look it up from the recipientId
        const recipient = await SuperUser.findById(recipientId);

        if (!recipient) {
            return new Response(JSON.stringify({ error: 'Recipient not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Create notification in database
        const notification = new Notification({
            title,
            message,
            recipient: recipientId,
            recipientType: 'superuser',
            sender: session.user.id,
            senderType: 'superuser',
            read: false
        });

        await notification.save();

        // Get sender details for the notification
        const sender = await SuperUser.findById(session.user.id);

        // Send real-time notification with sender details
        const notificationWithSender = {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            sender: {
                _id: sender?._id || session.user.id,
                name: sender?.name || 'Unknown',
                profilePicture: sender?.profilePicture,
            },
            createdAt: notification.createdAt,
            read: false,
        };

        // Use recipient email instead of ID for SSE connections
        await sendNotification(recipient.email, notificationWithSender);
        await updateUnreadCount(recipient.email, await getUnreadCount(recipientId, 'superuser'));

        return new Response(JSON.stringify({ success: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        return new Response(JSON.stringify({ error: 'Failed to send notification' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PATCH - Mark notification(s) as read
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await connectDB();

        // Check if user is a SuperUser or regular User
        const email = session.user.email as string;
        let userId: string;
        let recipientType: 'user' | 'superuser';

        // Check if user is a SuperUser
        const superUser = await SuperUser.findOne({ email }).lean();
        if (superUser) {
            userId = superUser._id.toString();
            recipientType = 'superuser';
        } else {
            // Try to find as regular User
            const user = await User.findOne({ email }).lean();
            if (!user) {
                return new Response(JSON.stringify({ error: 'User not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            userId = user._id.toString();
            recipientType = 'user';
        }

        const data = await req.json();

        if (data.markAllRead) {
            // Mark all notifications as read
            await Notification.updateMany(
                { recipient: userId, recipientType, read: false },
                { $set: { read: true } }
            );

            // Update unread count via SSE
            const unreadCount = await getUnreadCount(userId, recipientType);
            await updateUnreadCount(email, unreadCount);

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (data.notificationId) {
            // Mark single notification as read
            const notification = await Notification.findOneAndUpdate(
                { _id: data.notificationId, recipient: userId, recipientType },
                { $set: { read: true } },
                { new: true }
            );

            if (!notification) {
                return new Response(JSON.stringify({ error: 'Notification not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Update unread count via SSE
            const unreadCount = await getUnreadCount(userId, recipientType);
            await updateUnreadCount(email, unreadCount);

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid request' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error updating notifications:', error);
        return new Response(JSON.stringify({ error: 'Failed to update notifications' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 