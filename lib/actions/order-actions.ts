'use server';

import { connectDB } from '@/lib/mongoose';
import Order from '@/models/Order';

/**
 * Get all orders
 */
export async function getOrders() {
    await connectDB();

    const orders = await Order.find({})
        .sort({ orderDate: -1 })
        .populate('vendorID', 'name')
        .populate('clientID', 'createdAt')
        .lean();

    return orders;
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string) {
    await connectDB();

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

    const orders = await Order.find({ clientID: clientId })
        .sort({ orderDate: -1 })
        .populate('vendorID', 'name')
        .lean();

    return orders;
} 