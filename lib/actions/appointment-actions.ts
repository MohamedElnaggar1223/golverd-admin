'use server';

import { connectDB } from '@/lib/mongoose';
import Appointment from '@/models/Appointment';
import { PERMISSION_KEYS } from '../permissions';
import { requirePermission } from '../auth-guards';

/**
 * Get all appointments
 */
export async function getAppointments() {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

        const appointments = await Appointment.find({})
            .sort({ date: -1 })
            .lean();

        return appointments;
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        throw error;
    }
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(appointmentId: string) {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

        const appointment = await Appointment.findById(appointmentId)
            .lean();

        if (!appointment) {
            throw new Error('Appointment not found');
        }

        return appointment;
    } catch (error: any) {
        // During build/prerender, return null instead of throwing
        if (error.name === 'AuthenticationError') {
            return null;
        }
        throw error;
    }
}

/**
 * Get appointments by vendor ID
 */
export async function getAppointmentsByVendorId(vendorId: string) {
    await connectDB();

    const user = await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

    // Priority 1: Business owners get unrestricted access
    if (!user.isBusinessOwner) {
        // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
        if (user.accountsManaged && user.accountsManaged.length > 0) {
            if (!user.accountsManaged.includes(vendorId)) {
                throw new Error("Access denied: You don't have permission to view appointments for this vendor");
            }
        }
        // Priority 3: If user has VIEW_ALL permission and no account restrictions, allow access
        else if (!user.permissions.viewAll) {
            throw new Error("Access denied: You don't have permission to view appointments for this vendor");
        }
    }

    const appointments = await Appointment.find({ vendorId })
        .sort({ date: -1 })
        .lean();

    return appointments;
}

/**
 * Get appointments by user ID
 */
export async function getAppointmentsByUserId(userId: string) {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

    const appointments = await Appointment.find({ userId })
        .sort({ date: -1 })
        .lean();

    return appointments;
}

/**
 * Get upcoming appointments
 */
export async function getUpcomingAppointments() {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
        date: { $gte: today.toISOString() }
    })
        .sort({ date: 1 })
        .lean();

    return appointments;
}

/**
 * Get past appointments
 */
export async function getPastAppointments() {
    await connectDB();

    await requirePermission([PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
        date: { $lt: today.toISOString() }
    })
        .sort({ date: -1 })
        .lean();

    return appointments;
}

/**
 * Toggle appointment sale status
 */
export async function toggleAppointmentSaleStatus(appointmentId: string) {
    await connectDB();

    await requirePermission(PERMISSION_KEYS.EDIT_APPOINTMENTS);

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new Error('Appointment not found');
    }

    appointment.saleStatus = appointment.saleStatus === 'Sold' ? 'No Sale' : 'Sold';
    await appointment.save();

    return { success: true, status: appointment.saleStatus };
} 