'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, BarChart3, TrendingUp, Clock } from "lucide-react";

export function AnalyticsTab() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">235</div>
                        <p className="text-xs text-muted-foreground">
                            +14.6% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">EGP 15,423</div>
                        <p className="text-xs text-muted-foreground">
                            +5.2% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">128</div>
                        <p className="text-xs text-muted-foreground">
                            +12.3% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24h</div>
                        <p className="text-xs text-muted-foreground">
                            -3h from last month
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Orders Overview</CardTitle>
                        <CardDescription>This tab will contain detailed analytics in the future.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center justify-center h-[300px] bg-muted/10">
                        <div className="text-center">
                            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                Detailed analytics will be implemented in a future update.
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Appointments Analytics</CardTitle>
                        <CardDescription>This tab will contain detailed analytics in the future.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 flex items-center justify-center h-[300px] bg-muted/10">
                        <div className="text-center">
                            <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                Detailed analytics will be implemented in a future update.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 