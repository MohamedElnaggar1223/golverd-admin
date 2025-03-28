'use client';

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AllVendorsTab } from "./components/all-vendors-tab";
import { GoldVendorsTab } from "./components/gold-vendors-tab";
import { SilverVendorsTab } from "./components/silver-vendors-tab";
import { RawVendorsTab } from "./components/raw-vendors-tab";

export default function VendorAccountsPage() {
    const [activeTab, setActiveTab] = useState("all");

    return (
        <div className="py-6 w-full px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[#44312D]">Vendor Accounts</h1>
                <p className="text-slate-500">Manage active vendor accounts</p>
            </div>

            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="w-fit mb-8 bg-transparent">
                    <TabsTrigger
                        value="all"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        All
                    </TabsTrigger>
                    <TabsTrigger
                        value="gold"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Gold
                    </TabsTrigger>
                    <TabsTrigger
                        value="silver"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Silver
                    </TabsTrigger>
                    <TabsTrigger
                        value="raw"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Raw
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <AllVendorsTab />
                </TabsContent>

                <TabsContent value="gold">
                    <GoldVendorsTab />
                </TabsContent>

                <TabsContent value="silver">
                    <SilverVendorsTab />
                </TabsContent>

                <TabsContent value="raw">
                    <RawVendorsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
} 