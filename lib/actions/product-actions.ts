'use server';

import { connectDB } from '@/lib/mongoose';
import Product, { IProduct } from '@/models/Product';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { getSession } from '@/lib/auth';
import { requirePermission } from '../auth-guards';
import { PERMISSION_KEYS } from '../permissions';

// Define a specific type for the capital calculation data
type ProductCapitalData = {
    _id: string;
    price?: number;
    branches?: Record<string, { inStock?: number }>; // Use Record as returned by .lean()
};

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

    // Check if user has permission to view vendor data
    try {
        const user = await requirePermission([PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL]);

        // Priority 1: Business owners get unrestricted access
        if (!user.isBusinessOwner) {
            // Priority 2: If user has accountsManaged, restrict to those accounts regardless of other permissions
            if (user.accountsManaged && user.accountsManaged.length > 0) {
                if (!user.accountsManaged.includes(vendorId)) {
                    throw new Error("Access denied: You don't have permission to view products for this vendor");
                }
            }
            // Priority 3: If user has VIEW_ALL permission and no account restrictions, allow access
            else if (!user.permissions.viewAll) {
                throw new Error("Access denied: You don't have permission to view products for this vendor");
            }
        }
    } catch (error: any) {
        // During build/prerender, return empty array instead of throwing
        if (error.name === 'AuthenticationError') {
            return [];
        }
        throw error;
    }

    const products = await Product.find({
        brandDocID: vendorId
    })
        .sort({ createdAt: -1 })
        .lean();

    return products;
}

/**
 * Get all products with fields needed for capital calculation
 */
export async function getAllProductsForCapital(): Promise<ProductCapitalData[]> {
    try {
        await connectDB();

        // Note: This function doesn't require authentication as it's used for calculations
        // Select only necessary fields: _id, price and branches (containing inStock)
        // Mongoose lean() returns plain objects, Map becomes Record
        const products = await Product.find({}, { _id: 1, price: 1, branches: 1 }).lean();

        // Type assertion to match the expected lean structure
        return products as ProductCapitalData[];
    } catch (error) {
        console.error("Error fetching products for capital calculation:", error);
        // During build/prerender, return empty array instead of throwing
        return [];
    }
}

/**
 * Upload a product image using Cloudinary
 */
export async function uploadProductImage(productId: string, file: Buffer) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Upload image to Cloudinary
        const imageUrl = await uploadImage(file, 'products');

        // Update product with new image
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }

        if (!product.images) {
            product.images = [];
        }

        product.images.push(imageUrl);
        await product.save();

        return { success: true, imageUrl };
    } catch (error) {
        console.error('Error uploading product image:', error);
        throw error;
    }
}

/**
 * Delete a product image
 */
export async function deleteProductImage(productId: string, imageUrl: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Find the product
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }

        // Remove image from Cloudinary
        await deleteImage(imageUrl);

        // Remove image from product
        if (product.images && product.images.length) {
            product.images = product.images.filter(img => img !== imageUrl);
            await product.save();
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting product image:', error);
        throw error;
    }
}

/**
 * Get top viewed products for dashboard with vendor information
 */
export async function getTopViewedProductsWithVendor(limit: number = 5) {
    try {
        await connectDB();

        // Get top viewed products with vendor information
        const products = await Product.find(
            { totalViews: { $gt: 0 } }, // Only products with views
            {
                _id: 1,
                name: 1,
                images: 1,
                totalViews: 1,
                brandDocID: 1
            }
        )
            .populate('brandDocID', 'name') // Populate vendor name
            .sort({ totalViews: -1 }) // Sort by views descending
            .limit(limit)
            .lean();

        return products;
    } catch (error) {
        console.error("Error fetching top viewed products with vendor:", error);
        // During build/prerender, return empty array instead of throwing
        return [];
    }
}

/**
 * Update product information
 */
export async function updateProduct(productId: string, data: any) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const product = await Product.findByIdAndUpdate(
            productId,
            { ...data },
            { new: true }
        );

        if (!product) {
            throw new Error('Product not found');
        }

        return { success: true, message: 'Product updated successfully' };
    } catch (error) {
        console.error('Error updating product:', error);
        throw error;
    }
} 