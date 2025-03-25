import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Notification from '@/models/Notification';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SuperUser from '@/models/SuperUser';
import { sendNotification, updateUnreadCount } from '@/lib/actions/notifications-actions';

// GET handler for fetching notifications
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const userId = session.user.id;
        const unread = req.nextUrl.searchParams.get('unread');
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

        let query: any = { recipient: userId };
        if (unread === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('sender', 'name profilePicture')
            .lean();

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            read: false
        });

        return NextResponse.json({
            notifications,
            unreadCount
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST handler for creating a notification
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();
        const { recipientId, title, message } = data;

        if (!recipientId || !title || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate recipient exists
        const recipient = await SuperUser.findById(recipientId);
        if (!recipient) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        const notification = await Notification.create({
            recipient: recipientId,
            sender: session.user.id,
            title,
            message,
            read: false
        });

        // Populate the sender information for the real-time notification
        const populatedNotification = await Notification.findById(notification._id)
            .populate('sender', 'name profilePicture')
            .lean();

        // Get updated unread count for the recipient
        const unreadCount = await Notification.countDocuments({
            recipient: recipientId,
            read: false
        });

        // Send real-time notification via SSE
        sendNotification(recipientId, populatedNotification);
        updateUnreadCount(recipientId, unreadCount);

        return NextResponse.json({ notification: populatedNotification }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH handler for marking notifications as read
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();
        const { notificationId, markAllRead } = data;

        const userId = session.user.id;

        if (markAllRead) {
            // Mark all notifications as read
            await Notification.updateMany(
                { recipient: userId, read: false },
                { $set: { read: true } }
            );

            // Emit updated count (0) via SSE
            updateUnreadCount(userId, 0);

            return NextResponse.json({ message: 'All notifications marked as read' });
        } else if (notificationId) {
            // Mark a specific notification as read
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { $set: { read: true } },
                { new: true }
            ).populate('sender', 'name profilePicture');

            if (!notification) {
                return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
            }

            // Get updated unread count
            const unreadCount = await Notification.countDocuments({
                recipient: userId,
                read: false
            });

            // Update unread count via SSE
            updateUnreadCount(userId, unreadCount);

            return NextResponse.json({ notification });
        } else {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 