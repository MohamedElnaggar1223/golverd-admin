// Client-side utility functions for vendor filtering

/**
 * Filters vendors to find pending requests (those with undefined/null status)
 * @param vendors The array of vendors to filter
 * @returns Filtered array of vendor requests
 */
export function filterVendorRequests(vendors: any[]) {
    if (!vendors) return [];
    return vendors.filter(vendor => !vendor.status).sort((a, b) => {
        // Sort by createdAt desc
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
}

/**
 * Filters vendors by their category (Gold, Silver, Raw)
 * @param vendors The array of vendors to filter
 * @param category The category to filter by
 * @returns Filtered array of vendors matching the category
 */
export function filterVendorsByCategory(vendors: any[], category?: string) {
    if (!vendors) return [];

    // Filter out vendor requests (undefined/null status)
    const activeVendors = vendors.filter(vendor => vendor.status);

    if (!category || category === 'all') {
        return activeVendors;
    }

    return activeVendors.filter(vendor => {
        if (category === 'gold') {
            return vendor.chosenShopStyle?.toLowerCase().includes('gold');
        } else if (category === 'silver') {
            return vendor.chosenShopStyle?.toLowerCase().includes('silver');
        } else if (category === 'raw') {
            return !vendor.chosenShopStyle?.toLowerCase().includes('gold') &&
                !vendor.chosenShopStyle?.toLowerCase().includes('silver');
        }
        return false;
    });
}

/**
 * Gets the vendor category from shop style string
 * @param shopStyle The shop style string
 * @returns The simplified category: Gold, Silver, or Raw
 */
export function getVendorCategory(shopStyle: string | undefined) {
    if (!shopStyle) return 'No category';

    if (shopStyle.toLowerCase().includes('gold')) return 'Gold';
    if (shopStyle.toLowerCase().includes('silver')) return 'Silver';
    return 'Raw';
} 