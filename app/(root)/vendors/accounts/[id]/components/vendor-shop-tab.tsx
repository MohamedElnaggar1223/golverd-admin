'use client';

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductsByVendorId } from "@/lib/actions/product-actions";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Star } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useRouter } from "next/navigation";

interface VendorShopTabProps {
    vendorId: string;
}

export function VendorShopTab({ vendorId }: VendorShopTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const router = useRouter();

    // Fetch products for the vendor
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products', vendorId],
        queryFn: () => getProductsByVendorId(vendorId)
    });

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return products.filter((product: any) => {
            return !debouncedSearch ||
                (product.name && product.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                (product.category && product.category.toLowerCase().includes(debouncedSearch.toLowerCase()));
        });
    }, [products, debouncedSearch]);

    // Generate rating stars
    const renderRatingStars = (rating: number = 0) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
            } else if (i === fullStars && hasHalfStar) {
                stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 opacity-50" />);
            } else {
                stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
            }
        }

        return stars;
    };

    // Handle product card click - navigate to edit product page
    const handleProductClick = (productId: string) => {
        router.push(`/vendors/accounts/${vendorId}/products/${productId}`);
    };

    // Create initials for product avatar fallback
    const getProductInitials = (name: string): string => {
        if (!name) return "P";
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8">Loading products...</div>
            ) : (
                <div className="flex flex-wrap gap-6">
                    {filteredProducts.map((product: any) => (
                        <Card
                            key={product._id}
                            className="overflow-hidden rounded-[4px] w-[218px] flex flex-col cursor-pointer transition-shadow shadow-none bg-transparent"
                            onClick={() => handleProductClick(product._id)}
                        >
                            <div className="h-[218px] w-[218px] bg-white flex items-center justify-center overflow-hidden rounded-[8px]">
                                {product.images && product.images.length > 0 ? (
                                    <Avatar className="h-[218px] w-[218px] rounded-none">
                                        <AvatarImage
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-white rounded-none text-2xl">
                                            {getProductInitials(product.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-full h-full bg-white flex items-center justify-center">
                                        <span className="text-2xl font-medium text-gray-700">
                                            {getProductInitials(product.name)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <CardContent className="px-4 flex-grow">
                                <div className="flex items-center space-x-1 mb-1">
                                    {renderRatingStars(product.rating)}
                                    <span className="text-sm text-gray-500 ml-1">
                                        ({product.reviews || 0})
                                    </span>
                                </div>
                                <h3 className="font-medium line-clamp-1">
                                    {product.name || 'Unknown Product'}
                                </h3>
                                <p className="text-[#44312D] font-semibold mt-1">
                                    {formatCurrency(product.price || 0, 'en-US', 'EGP')}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {product.category || 'No category'}
                                </p>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">
                            No products found. Try adjusting your search.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 