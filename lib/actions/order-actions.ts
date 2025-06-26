'use server';

import { connectDB } from '@/lib/mongoose';
import Order from '@/models/Order';
import { requirePermission } from '../auth-guards';
import { PERMISSION_KEYS } from '../permissions';

/**
 * Get all orders
 */
export async function getOrders() {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.VIEW_ORDERS, PERMISSION_KEYS.VIEW_ALL]);

        const orders = await Order.find({})
            .sort({ orderDate: -1 })
            .populate('vendorID', 'name')
            .populate('clientID', 'createdAt')
            .lean();

        return orders;
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        throw error;
    }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_ORDERS, PERMISSION_KEYS.VIEW_ALL]);

    const order = await Order.findById(orderId)
        .populate('vendorID', 'name')
        .lean();

    if (!order) {
        throw new Error('Order not found');
    }

    return order;
}

/**
 * Get orders by vendor ID
 */
export async function getOrdersByVendorId(vendorId: string) {
    await connectDB();

    const user = await requirePermission([PERMISSION_KEYS.VIEW_ORDERS, PERMISSION_KEYS.VIEW_ALL]);

    // Priority 1: Business owners get unrestricted access
    if (!user.isBusinessOwner) {
        // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
        if (user.accountsManaged && user.accountsManaged.length > 0) {
            if (!user.accountsManaged.includes(vendorId)) {
                throw new Error("Access denied: You don't have permission to view orders for this vendor");
            }
        }
        // Priority 3: If user has VIEW_ALL permission and no account restrictions, allow access
        else if (!user.permissions.viewAll) {
            throw new Error("Access denied: You don't have permission to view orders for this vendor");
        }
    }

    const orders = await Order.find({ vendorID: vendorId })
        .sort({ orderDate: -1 })
        .lean();

    return orders;
}

/**
 * Get orders by client ID
 */
export async function getOrdersByClientId(clientId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_ORDERS, PERMISSION_KEYS.VIEW_ALL]);

    const orders = await Order.find({ clientID: clientId })
        .sort({ orderDate: -1 })
        .populate('vendorID', 'name')
        .lean();

    return orders;
}

/**
 * Toggle order sale status
 */
export async function toggleOrderSaleStatus(orderId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.EDIT_ORDERS, PERMISSION_KEYS.EDIT_ALL]);

    const order = await Order.findById(orderId);
    if (!order) {
        throw new Error('Order not found');
    }

    order.status = order.status === 'Completed' ? 'cancelled' : 'Completed';
    await order.save();

    return { success: true, status: order.status };
}

