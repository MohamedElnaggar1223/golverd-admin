import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SuperUser from '@/models/SuperUser';
import { sendNotification, updateUnreadCount } from '@/lib/actions/notifications-actions';

// Helper function to get unread count for a user
async function getUnreadCount(userId: string): Promise<number> {
    await connectDB();
    return await Notification.countDocuments({
        recipient: userId,
        read: false
    });
}

// GET handler for fetching notifications
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await connectDB();
        const userId = session.user.id;

        // Get notifications for the current user
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('sender', 'name profilePicture')
            .lean();

        // Get unread count
        const unreadCount = await getUnreadCount(userId);

        return new Response(JSON.stringify({
            notifications,
            unreadCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch notifications'
        }), {
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
            sender: session.user.id,
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
        await updateUnreadCount(recipient.email, await getUnreadCount(recipientId));

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

// PATCH handler for marking notifications as read
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
        const data = await req.json();
        const userId = session.user.id;
        const userEmail = session.user.email;

        if (data.markAllRead) {
            // Mark all as read
            await Notification.updateMany(
                { recipient: userId, read: false },
                { $set: { read: true } }
            );

            // Update unread count via SSE (should be 0)
            await updateUnreadCount(userEmail, 0);

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (data.notificationId) {
            // Mark single notification as read
            const notification = await Notification.findOneAndUpdate(
                { _id: data.notificationId, recipient: userId },
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
            const unreadCount = await getUnreadCount(userId);
            await updateUnreadCount(userEmail, unreadCount);

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