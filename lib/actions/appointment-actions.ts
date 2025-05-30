'use server';

import { connectDB } from '@/lib/mongoose';
import Appointment from '@/models/Appointment';

/**
 * Get all appointments
 */
export async function getAppointments() {
    await connectDB();

    const appointments = await Appointment.find({})
        .sort({ date: -1 })
        .lean();

    return appointments;
}

/**
 * Get appointment by ID
 */
export async function getAppointmentById(appointmentId: string) {
    await connectDB();

    const appointment = await Appointment.findById(appointmentId)
        .lean();

    if (!appointment) {
        throw new Error('Appointment not found');
    }

    return appointment;
}

/**
 * Get appointments by vendor ID
 */
export async function getAppointmentsByVendorId(vendorId: string) {
    await connectDB();

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

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        throw new Error('Appointment not found');
    }

    appointment.saleStatus = appointment.saleStatus === 'Sold' ? 'No Sale' : 'Sold';
    await appointment.save();

    return { success: true, status: appointment.saleStatus };
} 