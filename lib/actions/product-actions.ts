'use server';

import { connectDB } from '@/lib/mongoose';
import Product from '@/models/Product';

/**
 * Get product by ID
 */
export async function getProductById(productId: string) {
    await connectDB();

    const product = await Product.findById(productId).lean();

    if (!product) {
        return null;
    }

    return product;
}

/**
 * Get multiple products by their IDs
 */
export async function getProductsByIds(productIds: string[]) {
    await connectDB();

    if (!productIds || productIds.length === 0) {
        return [];
    }

    const products = await Product.find({
        _id: { $in: productIds }
    }).lean();

    // Convert to a map for easier access
    const productMap = products.reduce((acc, product) => {
        acc[product._id] = product;
        return acc;
    }, {} as Record<string, any>);

    return productMap;
}

/**
 * Search products by name or category
 */
export async function searchProducts(query: string, limit: number = 10) {
    await connectDB();

    if (!query) {
        return [];
    }

    const products = await Product.find({
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
        ]
    })
        .limit(limit)
        .lean();

    return products;
}

/**
 * Get products by vendor/brand ID
 */
export async function getProductsByVendorId(vendorId: string) {
    await connectDB();

    const products = await Product.find({
        brandDocID: vendorId
    })
        .sort({ createdAt: -1 })
        .lean();

    return products;
} 