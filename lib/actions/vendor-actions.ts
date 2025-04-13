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

        // Get all vendors in one query
        const vendors = await Vendor.find()
            .sort({ name: 1 })
            .lean();

        return vendors;
    } catch (error) {
        console.error('Error fetching vendors:', error);
        return [];
    }
}

export async function getVendorById(vendorId: string) {
    try {
        await connectDB();

        const vendor = await Vendor.findById(vendorId).lean();
        if (!vendor) {
            throw new Error("Vendor not found");
        }

        return vendor;
    } catch (error) {
        console.error(`Error fetching vendor ${vendorId}:`, error);
        throw new Error("Failed to fetch vendor");
    }
}

export async function approveVendor(id: string, data: { rent: number, commission: number, activationDate: Date }) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const vendor = await Vendor.findByIdAndUpdate(
            id,
            {
                status: 'approved',
                rent: data.rent,
                commission: data.commission,
                activationDate: data.activationDate
            },
            { new: true }
        );

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return { success: true, message: 'Vendor approved successfully' };
    } catch (error) {
        console.error('Error approving vendor:', error);
        throw error;
    }
}

export async function rejectVendor(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const vendor = await Vendor.findByIdAndUpdate(
            id,
            { status: 'rejected' },
            { new: true }
        );

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return vendor;
    } catch (error) {
        console.error('Error rejecting vendor:', error);
        throw error;
    }
}

export async function freezeVendorAccount(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const vendor = await Vendor.findByIdAndUpdate(
            id,
            [
                {
                    $set: {
                        status: {
                            $cond: {
                                if: { $eq: ["$status", "frozen"] },
                                then: "approved",
                                else: "frozen"
                            }
                        }
                    }
                }
            ],
            { new: true }
        );

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return { success: true, message: 'Vendor account frozen successfully' };
    } catch (error) {
        console.error('Error freezing vendor account:', error);
        throw error;
    }
}

export async function deleteVendorAccount(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const result = await Vendor.findByIdAndDelete(id);

        if (!result) {
            throw new Error('Vendor not found');
        }

        return { success: true, message: 'Vendor deleted successfully' };
    } catch (error) {
        console.error('Error deleting vendor account:', error);
        throw error;
    }
} 