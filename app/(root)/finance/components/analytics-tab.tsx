'use client';

import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getBills } from "@/lib/actions/bill-actions";
import { getVendorCategory } from "@/lib/vendor-utils";
import { formatCurrency, calculatePercentageChange } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Calendar, TrendingUp, BadgeDollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Image from "next/image";

// Helper function to get month name
const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('default', { month: 'short' });
};

// Define types for clarity
type MonthlyMetricData = {
    month: number;
    monthName: string;
    sales: number; rent: number; commission: number; revenue: number;
    goldSales: number; silverSales: number; rawSales: number;
    goldRent: number; silverRent: number; rawRent: number;
    goldCommission: number; silverCommission: number; rawCommission: number;
    goldRevenue: number; silverRevenue: number; rawRevenue: number;
};

type MetricTotals = {
    total: number;
    gold: number;
    silver: number;
    raw: number;
};

type PercentageChanges = {
    total: number | null;
    gold: number | null;
    silver: number | null;
    raw: number | null;
};

// Helper component for displaying segment breakdown (Updated)
function SegmentStat({ label, value, percentage }: { label: string, value: number, percentage: number | null }) {
    const color = label === 'Gold' ? 'text-yellow-500' : label === 'Silver' ? 'text-gray-400' : 'text-orange-700';
    const bgColor = label === 'Gold' ? 'bg-yellow-100' : label === 'Silver' ? 'bg-gray-100' : 'bg-orange-100';
    const iconColor = percentage === null ? 'text-gray-500' : percentage >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="flex justify-between items-center py-1">
            <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${bgColor}`}></span>
                <span className={`font-medium ${color}`}>{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="font-medium">{formatCurrency(value)}</span>
                {(percentage !== null && percentage !== 0) ? (
                    <span className={`flex items-center text-xs ${iconColor}`}>
                        {percentage !== 0 && ( // Only show arrow if not 0%
                            percentage > 0 ? <Image src="/icons/arrow-up.svg" alt="Arrow Up" width={12} height={12} /> : <Image src="/icons/arrow-down.svg" alt="Arrow Down" width={12} height={12} />
                        )}
                        {/* Format the number with sign */}
                        {`${percentage >= 0 ? '' : ''}${percentage.toFixed(1)}%`}
                    </span>
                ) : (
                    <span className="text-xs text-gray-500">--</span> // Display '--' for null percentage
                )}
            </div>
        </div>
    );
}

// Updated AnalyticsChartCard component (Header section updated)
function AnalyticsChartCard({ title, data, metricKey, totals, percentages }: {
    title: string;
    data: MonthlyMetricData[];
    metricKey: 'sales' | 'rent' | 'commission' | 'revenue';
    totals: MetricTotals;
    percentages: PercentageChanges;
}) {
    const strokeColor = metricKey === 'sales' ? '#3b82f6' : metricKey === 'rent' ? '#f97316' : metricKey === 'commission' ? '#8b5cf6' : '#10b981';
    const formatYAxis = (value: number) => formatCurrency(value).replace(/EGP\s?/, '');

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-700">{title}</CardTitle>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</span>
                    {percentages.total !== null ? (
                        <span className={`flex items-center text-xs font-medium ${percentages.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {percentages.total !== 0 && ( // Only show arrow if not 0%
                                percentages.total > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />
                            )}
                            {/* Format the number with sign */}
                            {`${percentages.total >= 0 ? '+' : ''}${percentages.total.toFixed(1)}%`}
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-gray-500">--</span> // Display '--' for null percentage
                    )}
                </div>
                <p className="text-xs text-muted-foreground">vs last month</p>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="monthName"
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={formatYAxis}
                                tick={{ fontSize: 12, fill: '#6b7280' }}
                                axisLine={false}
                                tickLine={false}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: '12px', borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '4px 8px' }}
                                labelStyle={{ fontWeight: '500', marginBottom: '4px' }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Line
                                type="monotone"
                                dataKey={metricKey}
                                stroke={strokeColor}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1 text-sm border-t pt-3">
                    <SegmentStat label="Gold" value={totals.gold} percentage={percentages.gold} />
                    <SegmentStat label="Silver" value={totals.silver} percentage={percentages.silver} />
                    <SegmentStat label="Raw" value={totals.raw} percentage={percentages.raw} />
                </div>
            </CardContent>
        </Card>
    );
}

export function AnalyticsTab() {
    const { data: bills = [] } = useSuspenseQuery<any[]>({
        queryKey: ['bills'],
        queryFn: getBills,
    });

    const { monthlyChartData, overallTotals, percentageChanges } = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-indexed month

        const monthlyDataMap: Record<number, MonthlyMetricData> = {};
        for (let i = 1; i <= 12; i++) {
            monthlyDataMap[i] = {
                month: i, monthName: getMonthName(i),
                sales: 0, rent: 0, commission: 0, revenue: 0,
                goldSales: 0, silverSales: 0, rawSales: 0,
                goldRent: 0, silverRent: 0, rawRent: 0,
                goldCommission: 0, silverCommission: 0, rawCommission: 0,
                goldRevenue: 0, silverRevenue: 0, rawRevenue: 0
            };
        }

        bills.forEach((bill) => {
            if (bill.year === currentYear && bill.month >= 1 && bill.month <= 12) {
                const month = bill.month;
                const category = getVendorCategory(bill.vendor?.chosenShopStyle);
                const rent = bill.rent || 0;
                const commission = bill.commission || 0;
                const sales = typeof bill.totalSales === 'number' ? bill.totalSales : 0;
                const revenue = rent + commission;

                monthlyDataMap[month].sales += sales;
                monthlyDataMap[month].rent += rent;
                monthlyDataMap[month].commission += commission;
                monthlyDataMap[month].revenue += revenue;

                if (category === 'Gold') {
                    monthlyDataMap[month].goldSales += sales; monthlyDataMap[month].goldRent += rent; monthlyDataMap[month].goldCommission += commission; monthlyDataMap[month].goldRevenue += revenue;
                } else if (category === 'Silver') {
                    monthlyDataMap[month].silverSales += sales; monthlyDataMap[month].silverRent += rent; monthlyDataMap[month].silverCommission += commission; monthlyDataMap[month].silverRevenue += revenue;
                } else {
                    monthlyDataMap[month].rawSales += sales; monthlyDataMap[month].rawRent += rent; monthlyDataMap[month].rawCommission += commission; monthlyDataMap[month].rawRevenue += revenue;
                }
            }
        });

        const monthlyChartData = Object.values(monthlyDataMap);

        const overallTotals = {
            sales: { total: 0, gold: 0, silver: 0, raw: 0 },
            rent: { total: 0, gold: 0, silver: 0, raw: 0 },
            commission: { total: 0, gold: 0, silver: 0, raw: 0 },
            revenue: { total: 0, gold: 0, silver: 0, raw: 0 },
        };
        monthlyChartData.forEach(monthData => {
            overallTotals.sales.total += monthData.sales; overallTotals.sales.gold += monthData.goldSales; overallTotals.sales.silver += monthData.silverSales; overallTotals.sales.raw += monthData.rawSales;
            overallTotals.rent.total += monthData.rent; overallTotals.rent.gold += monthData.goldRent; overallTotals.rent.silver += monthData.silverRent; overallTotals.rent.raw += monthData.rawRent;
            overallTotals.commission.total += monthData.commission; overallTotals.commission.gold += monthData.goldCommission; overallTotals.commission.silver += monthData.silverCommission; overallTotals.commission.raw += monthData.rawCommission;
            overallTotals.revenue.total += monthData.revenue; overallTotals.revenue.gold += monthData.goldRevenue; overallTotals.revenue.silver += monthData.silverRevenue; overallTotals.revenue.raw += monthData.rawRevenue;
        });

        let latestMonthIndex = -1;
        for (let i = currentMonth - 1; i >= 0; i--) {
            if (monthlyChartData[i].sales > 0 || monthlyChartData[i].rent > 0 || monthlyChartData[i].commission > 0 || monthlyChartData[i].revenue > 0) {
                latestMonthIndex = i;
                break;
            }
        }
        const prevMonthIndex = latestMonthIndex > 0 ? latestMonthIndex - 1 : -1;

        const percentageChanges = {
            sales: { total: null, gold: null, silver: null, raw: null },
            rent: { total: null, gold: null, silver: null, raw: null },
            commission: { total: null, gold: null, silver: null, raw: null },
            revenue: { total: null, gold: null, silver: null, raw: null },
        } as Record<keyof typeof overallTotals, PercentageChanges>;

        if (latestMonthIndex !== -1 && prevMonthIndex !== -1) {
            const current = monthlyChartData[latestMonthIndex];
            const previous = monthlyChartData[prevMonthIndex];

            percentageChanges.sales.total = calculatePercentageChange(previous.sales, current.sales);
            percentageChanges.sales.gold = calculatePercentageChange(previous.goldSales, current.goldSales);
            percentageChanges.sales.silver = calculatePercentageChange(previous.silverSales, current.silverSales);
            percentageChanges.sales.raw = calculatePercentageChange(previous.rawSales, current.rawSales);

            percentageChanges.rent.total = calculatePercentageChange(previous.rent, current.rent);
            percentageChanges.rent.gold = calculatePercentageChange(previous.goldRent, current.goldRent);
            percentageChanges.rent.silver = calculatePercentageChange(previous.silverRent, current.silverRent);
            percentageChanges.rent.raw = calculatePercentageChange(previous.rawRent, current.rawRent);

            percentageChanges.commission.total = calculatePercentageChange(previous.commission, current.commission);
            percentageChanges.commission.gold = calculatePercentageChange(previous.goldCommission, current.goldCommission);
            percentageChanges.commission.silver = calculatePercentageChange(previous.silverCommission, current.silverCommission);
            percentageChanges.commission.raw = calculatePercentageChange(previous.rawCommission, current.rawCommission);

            percentageChanges.revenue.total = calculatePercentageChange(previous.revenue, current.revenue);
            percentageChanges.revenue.gold = calculatePercentageChange(previous.goldRevenue, current.goldRevenue);
            percentageChanges.revenue.silver = calculatePercentageChange(previous.silverRevenue, current.silverRevenue);
            percentageChanges.revenue.raw = calculatePercentageChange(previous.rawRevenue, current.rawRevenue);
        }

        return { monthlyChartData, overallTotals, percentageChanges };

    }, [bills]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <h2 className="text-xl font-semibold">Financial Analytics ({new Date().getFullYear()})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnalyticsChartCard title="Total Sales" data={monthlyChartData} metricKey="sales" totals={overallTotals.sales} percentages={percentageChanges.sales} />
                <AnalyticsChartCard title="Total Rent" data={monthlyChartData} metricKey="rent" totals={overallTotals.rent} percentages={percentageChanges.rent} />
                <AnalyticsChartCard title="Total Commission" data={monthlyChartData} metricKey="commission" totals={overallTotals.commission} percentages={percentageChanges.commission} />
                <AnalyticsChartCard title="Total Revenue" data={monthlyChartData} metricKey="revenue" totals={overallTotals.revenue} percentages={percentageChanges.revenue} />
            </div>
        </div>
    );
} 