'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VendorAnalyticsTabProps {
    vendorId: string;
}

export function VendorAnalyticsTab({ vendorId }: VendorAnalyticsTabProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500">
                            Detailed analytics for this vendor will be available soon.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium">Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500">
                            Performance metrics and insights are under development.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 