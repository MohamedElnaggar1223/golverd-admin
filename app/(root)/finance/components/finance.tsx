'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OverviewTab } from "./overview-tab";
import { VendorsTab } from "./vendors-tab";
import { AnalyticsTab } from "./analytics-tab";

export default function Finance() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["overview", "vendors", "analytics"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/finance?tab=${value}`);
    };

    return (
        <div className="py-6 w-full px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-fit mb-8 bg-transparent">
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="overview">Overview</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="analytics">Analytics</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-0 w-full">
                    <OverviewTab />
                </TabsContent>
                <TabsContent value="vendors" className="mt-0 w-full">
                    <VendorsTab />
                </TabsContent>
                <TabsContent value="analytics" className="mt-0 w-full">
                    <AnalyticsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
} 