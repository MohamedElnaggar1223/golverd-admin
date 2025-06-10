'use server';

import { connectDB } from '@/lib/mongoose';
import User from '@/models/User';
import Appointment from '@/models/Appointment';
import Vendor from '@/models/Vendor';
import Order from '@/models/Order';
import Notification from '@/models/Notification';
import { sendNotification, updateUnreadCount } from './notifications-actions';
import { OrderItem } from '../types/orders.types';
import { requirePermission } from '../auth-guards';
import { PERMISSION_KEYS } from '../permissions';

/**
 * Get all users 
 * This function fetches all users at once for client-side filtering/pagination
 */
export async function getUsers() {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]);

    // Fetch all users for client-side processing
    const users = await User.find({})
        .sort({ createdAt: -1 })
        .lean();

    console.log(users)

    return users;
}

/**
 * Get all orders for a user 
 */
export async function getUserOrders(userId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]);

    // Fetch all orders for this user
    const orders = await Order.find({ clientID: userId })
        .sort({ orderDate: -1 })
        .populate('vendorID', 'name')
        .lean();

    return orders as OrderItem[];
}

/**
 * Get all appointments for a user
 */
export async function getUserAppointments(userId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]);

    // Fetch all appointments for this user
    const appointments = await Appointment.find({ userId: userId })
        .sort({ date: -1 })
        .lean();

    return appointments;
}

/**
 * Delete a user and all associated data
 */
export async function deleteUser(userId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]); // Only users with view users can delete

    await User.findByIdAndDelete(userId);

    // Cleanup related data
    await Appointment.deleteMany({ userId: userId });
    await Order.deleteMany({ clientID: userId });
    // Delete any notifications for this user
    await Notification.deleteMany({ recipient: userId, recipientType: 'user' });

    return { success: true };
}

/**
 * Toggle the sale status of an appointment
 */
export async function toggleAppointmentSaleStatus(appointmentId: string) {
    await connectDB();

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new Error('Appointment not found');
    }

    console.log(appointment)

    // Toggle between 'Sold' and 'No Sale'
    const currentStatus = appointment.saleStatus;
    appointment.saleStatus = currentStatus === 'Sold' ? 'No Sale' : 'Sold';
    await appointment.save();

    return { success: true, status: appointment.saleStatus };
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string) {
    await connectDB();

    const notifications = await Notification.find({
        recipient: userId,
        recipientType: 'user'
    })
        .sort({ createdAt: -1 })
        .lean();

    return notifications;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
    await connectDB();

    // Count unread notifications
    const count = await Notification.countDocuments({
        recipient: userId,
        recipientType: 'user',
        read: false
    });

    return { count };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
    await connectDB();

    const notification = await Notification.findById(notificationId);
    if (!notification) {
        throw new Error('Notification not found');
    }

    // Mark as read
    notification.read = true;
    await notification.save();

    // Update unread count for real-time UI update
    // Get user email to update unread count through SSE
    const user = await User.findById(notification.recipient);
    if (user?.email && notification.recipientType === 'user') {
        // Get updated count
        const count = await Notification.countDocuments({
            recipient: notification.recipient,
            recipientType: 'user',
            read: false
        });

        // Send unread count update via SSE
        await updateUnreadCount(user.email, count);
    }

    return { success: true };
}

/**
 * Send notification to specific user or all users
 */
export async function sendUserNotification(data: {
    title: string;
    message: string;
    userId?: string;
    sendToAll: boolean;
}) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]); // Only users with view users can send notifications

    const { title, message, userId, sendToAll } = data;

    if (sendToAll) {
        // Get all user IDs and send notification to each
        const users = await User.find({}, '_id email').lean();
        let successCount = 0;

        for (const user of users) {
            try {
                if (user.email) {
                    // Create notification in database
                    const notification = new Notification({
                        recipient: user._id,
                        recipientType: 'user',
                        sender: 'system',
                        senderType: 'system',
                        title,
                        message,
                        read: false
                    });
                    await notification.save();

                    // Send real-time notification via SSE
                    await sendNotification(user.email, {
                        title,
                        message,
                        sender: {
                            _id: 'system',
                            name: 'System',
                        },
                        createdAt: new Date().toISOString(),
                        read: false,
                    });

                    // Update unread count
                    const count = await Notification.countDocuments({
                        recipient: user._id,
                        recipientType: 'user',
                        read: false
                    });
                    await updateUnreadCount(user.email, count);

                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to send notification to user ${user._id}:`, error);
            }
        }

        return {
            success: true,
            message: `Sent notifications to ${successCount} out of ${users.length} users`
        };
    } else if (userId) {
        // Send to specific user
        const user = await User.findById(userId, 'email').lean();
        if (!user?.email) {
            throw new Error('User email not found');
        }

        // Create notification in database
        const notification = new Notification({
            recipient: userId,
            recipientType: 'user',
            sender: 'system',
            senderType: 'system',
            title,
            message,
            read: false
        });
        await notification.save();

        // Send real-time notification via SSE
        await sendNotification(user.email, {
            title,
            message,
            sender: {
                _id: 'system',
                name: 'System',
            },
            createdAt: new Date().toISOString(),
            read: false,
        });

        // Update unread count
        const count = await Notification.countDocuments({
            recipient: userId,
            recipientType: 'user',
            read: false
        });
        await updateUnreadCount(user.email, count);

        return { success: true, message: 'Notification sent successfully' };
    }

    throw new Error('Either userId or sendToAll must be provided');
} 