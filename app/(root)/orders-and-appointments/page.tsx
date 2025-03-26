'use client';

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrdersTab } from "./components/orders-tab";
import { AppointmentsTab } from "./components/appointments-tab";
import { AnalyticsTab } from "./components/analytics-tab";

export default function OrdersAndAppointmentsPage() {
    const [activeTab, setActiveTab] = useState("orders");

    return (
        <div className="py-6 w-full px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[#44312D]">Orders & Appointments</h1>
                <p className="text-slate-500">Manage and track all orders and appointments</p>
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
                        value="analytics"
                        className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit'
                    >
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="orders">
                    <OrdersTab />
                </TabsContent>

                <TabsContent value="appointments">
                    <AppointmentsTab />
                </TabsContent>

                <TabsContent value="analytics">
                    <AnalyticsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
} 