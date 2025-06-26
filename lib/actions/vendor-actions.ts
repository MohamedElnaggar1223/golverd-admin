'use server';

import { connectDB } from '@/lib/mongoose';
import Vendor from '@/models/Vendor';
import { getSession } from '@/lib/auth';
import { requirePermission } from '../auth-guards';
import { PERMISSION_KEYS } from '../permissions';

export async function getVendors() {
    try {
        await connectDB();

        const user = await requirePermission([PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL]);

        let vendors;

        // Priority 1: Business owners get unrestricted access
        if (user.isBusinessOwner) {
            vendors = await Vendor.find()
                .sort({ name: 1 })
                .lean();
        }
        // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
        else if (user.accountsManaged && user.accountsManaged.length > 0) {
            vendors = await Vendor.find({ _id: { $in: user.accountsManaged } })
                .sort({ name: 1 })
                .lean();
        }
        // Priority 3: If user has VIEW_ALL permission and no account restrictions, show all
        else if (user.permissions.viewAll) {
            vendors = await Vendor.find()
                .sort({ name: 1 })
                .lean();
        }
        // Priority 4: User has viewVendors permission but no assigned accounts
        else {
            // User has no assigned accounts, return empty array
            return [];
        }

        return vendors;
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        console.error('Error fetching vendors:', error);
        return [];
    }
}

export async function getVendorById(vendorId: string) {
    try {
        await connectDB();

        const user = await requirePermission([PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL]);

        const vendor = await Vendor.findById(vendorId).lean();
        if (!vendor) {
            throw new Error("Vendor not found");
        }

        // Priority 1: Business owners get unrestricted access
        if (user.isBusinessOwner) {
            return vendor;
        }

        // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
        if (user.accountsManaged && user.accountsManaged.length > 0) {
            if (!user.accountsManaged.includes(vendorId)) {
                throw new Error("Access denied: You don't have permission to view this vendor");
            }
            return vendor;
        }

        // Priority 3: If user has VIEW_ALL permission and no account restrictions, allow access
        if (user.permissions.viewAll) {
            return vendor;
        }

        // Priority 4: User has viewVendors permission but no assigned accounts - deny access
        throw new Error("Access denied: You don't have permission to view this vendor");
    } catch (error: any) {
        // During build/prerender, return null instead of throwing
        if (error.name === 'AuthenticationError') {
            return null;
        }
        console.error(`Error fetching vendor ${vendorId}:`, error);
        throw new Error("Failed to fetch vendor");
    }
}

export async function approveVendor(id: string, data: { rent: number, commission: number, activationDate: Date }) {
    try {
        await connectDB();

        const user = await requirePermission([PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(id)) {
                    throw new Error("Access denied: You don't have permission to edit this vendor");
                }
            }
            // Priority 3: If user has EDIT_ALL permission and no account restrictions, allow access
            else if (!user.permissions.editAll) {
                throw new Error("Access denied: You don't have permission to edit this vendor");
            }
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

        const user = await requirePermission([PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(id)) {
                    throw new Error("Access denied: You don't have permission to edit this vendor");
                }
            }
            // Priority 3: If user has EDIT_ALL permission and no account restrictions, allow access
            else if (!user.permissions.editAll) {
                throw new Error("Access denied: You don't have permission to edit this vendor");
            }
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

        const user = await requirePermission([PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(id)) {
                    throw new Error("Access denied: You don't have permission to edit this vendor");
                }
            }
            // Priority 3: If user has EDIT_ALL permission and no account restrictions, allow access
            else if (!user.permissions.editAll) {
                throw new Error("Access denied: You don't have permission to edit this vendor");
            }
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

        const user = await requirePermission([PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(id)) {
                    throw new Error("Access denied: You don't have permission to edit this vendor");
                }
            }
            // Priority 3: If user has EDIT_ALL permission and no account restrictions, allow access
            else if (!user.permissions.editAll) {
                throw new Error("Access denied: You don't have permission to edit this vendor");
            }
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

export async function updateVendorRentAndCommission(id: string, data: { rent: number, commission: number }) {
    try {
        await connectDB();

        const user = await requirePermission([PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(id)) {
                    throw new Error("Access denied: You don't have permission to edit this vendor");
                }
            }
            // Priority 3: If user has EDIT_ALL permission and no account restrictions, allow access
            else if (!user.permissions.editAll) {
                throw new Error("Access denied: You don't have permission to edit this vendor");
            }
        }

        // Validate the input data
        if (typeof data.rent !== 'number' || data.rent < 0) {
            throw new Error('Rent must be a non-negative number');
        }
        if (typeof data.commission !== 'number' || data.commission < 0) {
            throw new Error('Commission must be a non-negative number');
        }

        const vendor = await Vendor.findByIdAndUpdate(
            id,
            {
                rent: data.rent,
                commission: data.commission,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return {
            success: true,
            message: 'Rent and commission updated successfully',
            vendor: {
                _id: vendor._id,
                rent: vendor.rent,
                commission: vendor.commission
            }
        };
    } catch (error) {
        console.error('Error updating vendor rent and commission:', error);
        throw error;
    }
} 