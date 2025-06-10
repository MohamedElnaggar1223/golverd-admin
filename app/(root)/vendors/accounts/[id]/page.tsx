'use client';

import { use, useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VendorOrdersTab } from "./components/vendor-orders-tab";
import { VendorAppointmentsTab } from "./components/vendor-appointments-tab";
import { VendorSalesTab } from "./components/vendor-sales-tab";
import { VendorShopTab } from "./components/vendor-shop-tab";
import { VendorAnalyticsTab } from "./components/vendor-analytics-tab";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getVendorById } from "@/lib/actions/vendor-actions";
import { getVendorCategory } from "@/lib/vendor-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQueryClient } from "@/lib/get-query-client";
import { Vendor } from "@/lib/types/vendors.types";
import EmbeddedVirtualStore from "@/components/shared/EmbeddedVirtualStore";

export default function VendorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState("orders");
    const router = useRouter();

    const queryClient = getQueryClient();

    const vendorsData = queryClient.getQueryData<Vendor[]>(['vendors']);

    // Fetch vendor details
    const { data: vendor } = useQuery({
        queryKey: ['vendor', id],
        queryFn: async () => {
            if (!vendorsData) {
                const vendor = await getVendorById(id);
                return vendor;
            }

            return vendorsData.find((vendor) => vendor._id === id);
        }
    });

    useEffect(() => {
        if (vendorsData) {
            queryClient.invalidateQueries({ queryKey: ['vendors', id] });
        }
    }, [vendorsData])

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

    if (!vendor) {
        return <div>Vendor not found</div>;
    }

    return (
        <div className="py-6 w-full px-6">
            <Button
                variant="outline"
                size="sm"
                className="mb-4"
                onClick={() => router.push('/vendors/accounts')}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
            </Button>

            <div className="flex items-center mb-6">
                <Avatar className="h-16 w-16 mr-4">
                    <AvatarImage src={vendor.logo || ''} alt={vendor.name} />
                    <AvatarFallback className='bg-[#E8E4E1]'>
                        {vendor.name ? vendor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'VN'}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-2xl font-semibold text-[#44312D]">{vendor.name}</h1>
                    <div className="flex items-center mt-1">
                        <div className="flex items-center space-x-1">
                            {renderRatingStars(vendor.reviews ? (vendor.ratings?.average || 0) : 0)}
                            <span className="text-sm text-gray-500 ml-1">
                                ({vendor.reviews || 0} reviews)
                            </span>
                        </div>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                            {getVendorCategory(vendor.chosenShopStyle)}
                        </span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="orders" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="w-fit mb-8 bg-transparent">
                    <TabsTrigger
                        value="orders"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Orders
                    </TabsTrigger>
                    <TabsTrigger
                        value="appointments"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Appointments
                    </TabsTrigger>
                    <TabsTrigger
                        value="sales"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Sales
                    </TabsTrigger>
                    <TabsTrigger
                        value="shop"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Shop
                    </TabsTrigger>
                    <TabsTrigger
                        value="virtual-store"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Virtual Store
                    </TabsTrigger>
                    <TabsTrigger
                        value="analytics"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <VendorOrdersTab vendorId={id} />
                </TabsContent>

                <TabsContent value="appointments">
                    <VendorAppointmentsTab vendorId={id} />
                </TabsContent>

                <TabsContent value="sales">
                    <VendorSalesTab vendorId={id} />
                </TabsContent>

                <TabsContent value="shop">
                    <VendorShopTab vendorId={id} />
                </TabsContent>

                <TabsContent value="virtual-store">
                    <EmbeddedVirtualStore />
                </TabsContent>

                <TabsContent value="analytics">
                    <VendorAnalyticsTab vendorId={id} />
                </TabsContent>
            </Tabs>
        </div>
    );
} 