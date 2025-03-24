'use server';

import { connectDB } from '@/lib/mongoose';
import Vendor from '@/models/Vendor';
import { getSession } from '@/lib/auth';

export async function getVendors() {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const vendors = await Vendor.find()
            .sort({ name: 1 })
            .lean();

        return vendors;
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return [];
    }
}

export async function getVendorById(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const vendor = await Vendor.findById(id).lean();

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return vendor;
    } catch (error) {
        console.error('Error fetching vendor:', error);
        throw error;
    }
} 