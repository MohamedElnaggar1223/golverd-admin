'use server';

import { connectDB } from '@/lib/mongoose';
import ShopVisit from '@/models/ShopVisit';

/**
 * Get shop visit count
 */
export async function getShopVisits() {
    try {
        await connectDB();

        let shopVisit = await ShopVisit.findById('shop_visits').lean();

        // If no record exists, create one with default count
        if (!shopVisit) {
            const newShopVisit = new ShopVisit({
                _id: 'shop_visits',
                visitCount: 0
            });
            const savedShopVisit = await newShopVisit.save();
            return savedShopVisit.visitCount;
        }

        return shopVisit.visitCount;
    } catch (error) {
        console.error("Error fetching shop visits:", error);
        // During build/prerender, return 0 instead of throwing
        return 0;
    }
}

/**
 * Increment shop visit count (for future use when tracking visits)
 */
export async function incrementShopVisits() {
    try {
        await connectDB();

        let shopVisit = await ShopVisit.findById('shop_visits');

        if (!shopVisit) {
            shopVisit = new ShopVisit({
                _id: 'shop_visits',
                visitCount: 1
            });
        } else {
            shopVisit.visitCount += 1;
        }

        await shopVisit.save();
        return shopVisit.visitCount;
    } catch (error) {
        console.error("Error incrementing shop visits:", error);
        throw error;
    }
} 