'use server';

import { connectDB } from "@/lib/mongoose";
import Bill from "@/models/Bill";
import Vendor from "@/models/Vendor";
import Order from "@/models/Order";
import { IBill } from "@/models/Bill";
import { v4 as uuidv4 } from "uuid";
import { getOrdersByVendorId } from "./order-actions";
import { requirePermission } from "../auth-guards";
import { PERMISSION_KEYS } from "../permissions";

/**
 * Get all bills with populated vendor information
 */
export async function getBills() {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.VIEW_FINANCIAL_CENTER, PERMISSION_KEYS.VIEW_ALL]);

        const bills = await Bill.find()
            .sort({ createdAt: -1 })
            .lean();

        // Fetch all vendor data at once for better performance
        const vendorIds = [...new Set(bills.map(bill => bill.vendorId))];
        const vendors = await Vendor.find({ _id: { $in: vendorIds } }).lean();
        const vendorMap = vendors.reduce((map, vendor) => {
            map[vendor._id] = vendor;
            return map;
        }, {} as Record<string, any>);

        // Attach vendor data to each bill
        return bills.map(bill => ({
            ...bill,
            vendor: vendorMap[bill.vendorId] || null
        }));
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        console.error("Error fetching bills:", error);
        throw new Error("Failed to fetch bills");
    }
}

/**
 * Get bills for a specific vendor
 */
export async function getVendorBills(vendorId: string) {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.VIEW_FINANCIAL_CENTER, PERMISSION_KEYS.VIEW_ALL]);

        const bills = await Bill.find({ vendorId })
            .sort({ createdAt: -1 })
            .lean();

        const vendor = await Vendor.findById(vendorId).lean();

        return bills.map(bill => ({
            ...bill,
            vendor
        }));
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        console.error(`Error fetching bills for vendor ${vendorId}:`, error);
        throw new Error("Failed to fetch vendor bills");
    }
}

/**
 * Create a new bill
 */
export async function createBill(data: Partial<IBill>) {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.EDIT_FINANCIAL_CENTER, PERMISSION_KEYS.EDIT_ALL]);

        const vendor = await Vendor.findById(data.vendorId).lean();
        if (!vendor) {
            throw new Error("Vendor not found");
        }

        // Generate due date (last day of the month)
        const dueDate = new Date(data.year || new Date().getFullYear(), data.month || new Date().getMonth() + 1, 0);

        const newBill = new Bill({
            _id: uuidv4(),
            ...data,
            dueDate,
            totalAmount: (data.rent || 0) + (data.commission || 0)
        });

        await newBill.save();
        return { success: true };
    } catch (error) {
        console.error("Error creating bill:", error);
        throw new Error("Failed to create bill");
    }
}

/**
 * Update a bill
 */
export async function updateBill(billId: string, data: Partial<IBill>) {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.EDIT_FINANCIAL_CENTER, PERMISSION_KEYS.EDIT_ALL]);

        const bill = await Bill.findById(billId);
        if (!bill) {
            throw new Error("Bill not found");
        }

        Object.keys(data).forEach(key => {
            // @ts-ignore
            bill[key] = data[key];
        });

        await bill.save();
        return { success: true };
    } catch (error) {
        console.error(`Error updating bill ${billId}:`, error);
        throw new Error("Failed to update bill");
    }
}

/**
 * Delete a bill
 */
export async function deleteBill(billId: string) {
    try {
        await connectDB();

        await requirePermission([PERMISSION_KEYS.EDIT_FINANCIAL_CENTER, PERMISSION_KEYS.EDIT_ALL]);

        await Bill.findByIdAndDelete(billId);
        return { success: true };
    } catch (error) {
        console.error(`Error deleting bill ${billId}:`, error);
        throw new Error("Failed to delete bill");
    }
}

/**
 * Generate bills for all vendors for the current month
 */
export async function generateMonthlyBills(skipPermissionCheck = false) {
    try {
        await connectDB();

        // Skip permission check for system/cron calls
        if (!skipPermissionCheck) {
            await requirePermission([PERMISSION_KEYS.EDIT_FINANCIAL_CENTER, PERMISSION_KEYS.EDIT_ALL]);
        }

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
        const currentYear = currentDate.getFullYear();

        console.log("Generating bills for the current month");
        console.log(currentMonth, currentYear);

        // Get all active vendors
        const vendors = await Vendor.find({
            activationDate: { $exists: true, $ne: null },
            status: "approved"
        }).lean();

        console.log("Vendors: ", vendors);

        let created = 0;
        let skipped = 0;

        for (const vendor of vendors) {
            // Skip if activation date is after current month
            if (!vendor.activationDate) continue;

            const activationDate = new Date(vendor.activationDate);
            console.log("Activation date: ", activationDate);
            console.log("Current month: ", currentMonth);
            console.log("Current year: ", currentYear);
            console.log("Activation date year: ", activationDate.getFullYear());
            console.log("Activation date month: ", activationDate.getMonth() + 1);
            console.log("Activation date day: ", activationDate.getDate());

            if (
                activationDate.getFullYear() > currentYear ||
                (activationDate.getFullYear() === currentYear &&
                    activationDate.getMonth() + 1 > currentMonth)
            ) {
                skipped++;
                continue;
            }

            // Check if a bill already exists for this vendor, month and year
            const existingBill = await Bill.findOne({
                vendorId: vendor._id,
                month: currentMonth,
                year: currentYear
            });

            if (existingBill) {
                skipped++;
                continue;
            }

            // Calculate total sales based on vendor orders for the current month
            const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
            const endOfMonth = new Date(currentYear, currentMonth, 0);

            console.log("Start of month: ", startOfMonth);
            console.log("End of month: ", endOfMonth);

            // Convert dates to seconds for comparison with orderDate._seconds
            const startSeconds = Math.floor(startOfMonth.getTime() / 1000);
            const endSeconds = Math.floor(endOfMonth.getTime() / 1000);

            console.log("Start seconds: ", startSeconds);
            console.log("End seconds: ", endSeconds);

            const vendorOrders = await Order.find({
                vendorID: vendor._id,
                status: { $in: ['Completed', 'Shipped', 'Delivered', 'completed', 'shipped', 'delivered'] },
                'orderDate._seconds': {
                    $gte: startSeconds,
                    $lt: endSeconds
                }
            }).lean();

            console.log("Vendor orders: ", vendorOrders);

            // Calculate total sales amount from orders
            const totalSales = vendorOrders.reduce((sum, order) => {
                // If there's a direct price field, use it
                if (order.price) {
                    return sum + order.price;
                }

                // Otherwise calculate from charges
                let orderTotal = 0;
                if (order.charges) {
                    // Convert Map to entries array if needed (depending on how the data comes back)
                    const chargesEntries = order.charges instanceof Map
                        ? Array.from(order.charges.entries())
                        : Object.entries(order.charges);

                    chargesEntries.forEach(([_, chargeItem]) => {
                        // Handle both direct object access and Map value format
                        const price = typeof chargeItem === 'object' ? chargeItem.price || 0 : 0;
                        const quantity = typeof chargeItem === 'object' ? chargeItem.quantity || 1 : 1;
                        orderTotal += price * quantity;
                    });
                }

                return sum + orderTotal;
            }, 0);

            console.log("Total sales: ", totalSales);

            // Calculate commission based on total sales
            const commission = totalSales * (vendor.commission || 0) / 100;

            console.log("Commission: ", commission);

            // Create new bill
            const newBill = new Bill({
                _id: uuidv4(),
                vendorId: vendor._id,
                month: currentMonth,
                year: currentYear,
                rent: vendor.rent || 0,
                commission,
                commissionPercentage: vendor.commission || 0,
                totalSales,
                totalAmount: (vendor.rent || 0) + commission,
                status: 'pending',
                dueDate: new Date(currentYear, currentMonth, 0) // Last day of current month
            });

            await newBill.save();
            created++;
        }

        return { created, skipped };
    } catch (error) {
        console.error("Error generating monthly bills:", error);
        throw new Error("Failed to generate monthly bills");
    }
} 