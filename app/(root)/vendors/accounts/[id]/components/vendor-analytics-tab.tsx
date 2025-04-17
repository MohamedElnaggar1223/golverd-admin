'use client';

import { useMemo, useState, useRef } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Printer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Import actions & utils
import { getBills } from '@/lib/actions/bill-actions';
import { getVendors } from '@/lib/actions/vendor-actions';
import { getAllProductsForCapital } from '@/lib/actions/product-actions';
import { getOrders } from '@/lib/actions/order-actions';
import { getAppointments } from '@/lib/actions/appointment-actions';
import { formatCurrency, calculatePercentageChange } from '@/lib/utils';

// Define time period type
type TimePeriod = 'monthly' | 'quarterly' | 'yearly';

interface VendorAnalyticsTabProps {
    vendorId: string;
}

// --- Helper Functions ---
const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('default', { month: 'short' });
};

// --- Reusable Components ---
function StatItem({ label, value, percentage, iconType }: {
    label: string;
    value: string | number;
    percentage: number | null;
    iconType?: 'currency' | 'count' | 'none';
}) {
    const iconColor = percentage === null ? 'text-gray-500' : percentage >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="flex justify-between items-center py-1 text-sm">
            <span className="text-gray-600">{label}</span>
            <div className="flex items-baseline gap-1.5">
                <span className="font-medium text-gray-800">{typeof value === 'number' && iconType === 'currency' ? formatCurrency(value) : value}</span>
                {percentage !== null ? (
                    <span className={`flex items-center text-xs ${iconColor}`}>
                        {percentage !== 0 && (
                            percentage > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                        {`${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`}
                    </span>
                ) : (
                    <span className="text-xs text-gray-500">--</span>
                )}
            </div>
        </div>
    );
}

// Summary Card
function SummaryCard({ title, value, change, timePeriod, onTimePeriodChange }: {
    title: string,
    value: string | number,
    change: number | null,
    timePeriod: TimePeriod,
    onTimePeriodChange: (value: TimePeriod) => void
}) {
    const iconColor = change === null ? 'text-gray-500' : change >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <Card className="col-span-1">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
                    <Select value={timePeriod} onValueChange={(val) => onTimePeriodChange(val as TimePeriod)}>
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue placeholder="Monthly" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                {change !== null ? (
                    <p className={`text-xs ${iconColor} flex items-center`}>
                        {change !== 0 && (
                            change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {`${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs previous ${timePeriod.slice(0, -2)}`}
                    </p>
                ) : (
                    <p className="text-xs text-gray-500">--</p>
                )}
            </CardContent>
        </Card>
    );
}

// Chart Card
function DashboardChartCard({ title, totalValue, totalChange, data, dataKey, details, xDataKey = "monthName", yTickFormatter }: {
    title: string;
    totalValue: string | number;
    totalChange: number | null;
    data: any[];
    dataKey: string;
    details: React.ReactNode;
    xDataKey?: string;
    yTickFormatter?: (value: any) => string;
}) {
    const strokeColor = '#44312D';
    const iconColor = totalChange === null ? 'text-gray-500' : totalChange >= 0 ? 'text-green-600' : 'text-red-600';

    // Default formatters for different data types
    const formatCurrencyValue = (value: number) => formatCurrency(value).replace(/EGP\s?/, '');
    const formatCountValue = (value: number) => value.toString();

    // Determine the right formatter based on the title or dataKey
    const getDefaultFormatter = () => {
        const isCountGraph =
            title.includes('Orders') ||
            title.includes('Appointments') ||
            title.includes('Products') ||
            dataKey.includes('Count') ||
            dataKey === 'orderCount' ||
            dataKey === 'appointmentCount' ||
            dataKey === 'productCount';

        return isCountGraph ? formatCountValue : formatCurrencyValue;
    };

    // Use provided formatter or pick the appropriate default
    const effectiveYTickFormatter = yTickFormatter || getDefaultFormatter();

    return (
        <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-700">{title}</CardTitle>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-gray-900">{totalValue}</span>
                    {totalChange !== null ? (
                        <span className={`flex items-center text-xs font-medium ${iconColor}`}>
                            {totalChange !== 0 && (
                                totalChange > 0 ? <ArrowUp className="h-3 w-3 mr-0.5" /> : <ArrowDown className="h-3 w-3 mr-0.5" />
                            )}
                            {`${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%`}
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-gray-500">--</span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">vs last month</p>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey={xDataKey} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={effectiveYTickFormatter} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} width={50} />
                            <Tooltip
                                contentStyle={{ fontSize: '12px', borderRadius: '0.375rem', border: '1px solid #e5e7eb', padding: '4px 8px' }}
                                labelStyle={{ fontWeight: '500', marginBottom: '4px' }}
                                formatter={(value: number, name: string) => {
                                    // Format tooltip values appropriately based on what type of data we're displaying
                                    const isCountMetric =
                                        name === 'orderCount' ||
                                        name === 'appointmentCount' ||
                                        name === 'productCount' ||
                                        name.includes('Count');

                                    return isCountMetric ? value.toString() : formatCurrency(value);
                                }}
                            />
                            <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                {details && <div className="mt-4 space-y-1 text-sm border-t pt-3">{details}</div>}
            </CardContent>
        </Card>
    );
}

// Pie Chart Card for demographics
function DemographicPieCard({ title, data }: {
    title: string;
    data: { name: string; value: number; color: string }[];
}) {
    const COLORS = ['#44312D', '#654A43', '#876358', '#A47E71', '#C29A8A', '#E0B6A5'];

    return (
        <Card className="col-span-1 md:col-span-2 xl:col-span-1">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-700">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="45%"
                                labelLine={false}
                                outerRadius={70}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => `${value} orders`}
                                labelFormatter={(name) => `${name}`}
                            />
                            <Legend
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{
                                    paddingTop: '20px',
                                    fontSize: '12px'
                                }}
                                formatter={(value, entry, index) => {
                                    // Format the legend text to show location and count
                                    const item = data[index];
                                    return `${item.name} (${item.value})`;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export function VendorAnalyticsTab({ vendorId }: VendorAnalyticsTabProps) {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [grossProfitTimePeriod, setGrossProfitTimePeriod] = useState<TimePeriod>('monthly');
    const [avgSalesTimePeriod, setAvgSalesTimePeriod] = useState<TimePeriod>('monthly');
    const [capitalTimePeriod, setCapitalTimePeriod] = useState<TimePeriod>('monthly');
    const reportRef = useRef<HTMLDivElement>(null);

    // Fetch Data
    const { data: billsData = [] } = useSuspenseQuery({ queryKey: ['bills'], queryFn: getBills });
    const { data: vendorsData = [] } = useSuspenseQuery({ queryKey: ['vendors'], queryFn: getVendors });
    const { data: productsData = [] } = useSuspenseQuery({ queryKey: ['productsCapital'], queryFn: getAllProductsForCapital });
    const { data: ordersData = [] } = useSuspenseQuery({ queryKey: ['orders'], queryFn: getOrders });
    const { data: appointmentsData = [] } = useSuspenseQuery({ queryKey: ['appointments'], queryFn: getAppointments });

    // Ensure data are arrays before processing
    const bills = Array.isArray(billsData) ? billsData : [];
    const vendors = Array.isArray(vendorsData) ? vendorsData : [];
    const products = Array.isArray(productsData) ? productsData : [];
    const orders = Array.isArray(ordersData) ? ordersData : [];
    const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];

    // --- Data Processing ---
    const processedData = useMemo(() => {
        const currentYear = selectedYear;
        const currentMonth = new Date().getMonth() + 1; // 1-12 format
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

        // Monthly Aggregates Map
        const monthlyMap: Record<number, {
            month: number;
            monthName: string;
            revenue: number;
            orderValue: number;
            orderCount: number;
            appointmentCount: number;
            appointmentValue: number;
            soldAppointmentCount: number;
            productCount: number;
            inStockCount: number;
            avgOrderValue: number;
            avgSalesValue: number;
            totalSalesValue: number;
            _orderValueSum: number;
            _appointmentValueSum: number;
            _totalValueSum: number;
        }> = {};

        for (let i = 1; i <= 12; i++) {
            monthlyMap[i] = {
                month: i,
                monthName: getMonthName(i),
                revenue: 0,
                orderValue: 0,
                orderCount: 0,
                appointmentCount: 0,
                appointmentValue: 0,
                soldAppointmentCount: 0,
                productCount: 0,
                inStockCount: 0,
                avgOrderValue: 0,
                avgSalesValue: 0,
                totalSalesValue: 0,
                _orderValueSum: 0,
                _appointmentValueSum: 0,
                _totalValueSum: 0
            };
        }

        // Process vendor's bills
        bills.forEach((bill) => {
            try {
                // Only process bills for this vendor
                if (String(bill.vendorId) !== vendorId) return;

                const billYear = typeof bill.year === 'number' ? bill.year : parseInt(String(bill.year));
                const billMonth = typeof bill.month === 'number' ? bill.month : parseInt(String(bill.month));

                if (!isNaN(billYear) && !isNaN(billMonth) && billYear === currentYear && billMonth >= 1 && billMonth <= 12) {
                    const rent = typeof bill.rent === 'number' ? bill.rent : 0;
                    const commission = typeof bill.commission === 'number' ? bill.commission : 0;
                    const totalSales = typeof bill.totalSales === 'number' ? bill.totalSales : 0;

                    monthlyMap[billMonth].revenue += rent + commission;
                }
            } catch (error) {
                console.error("Error processing bill:", error);
            }
        });

        // Extract vendor details
        const vendor = vendors.find(v => String(v._id) === vendorId);

        // Helper function to safely extract date
        const extractDate = (dateField: any): Date | null => {
            try {
                if (!dateField) return null;
                if (dateField && typeof dateField === 'object' && '_seconds' in dateField) {
                    return new Date(dateField._seconds * 1000);
                }
                return new Date(dateField);
            } catch (error) {
                return null;
            }
        };

        // Process vendor's products
        let vendorProducts = products.filter(product => {
            const brandId = String(
                (product as any).brandID ||
                (product as any).brandId ||
                (product as any).vendorID ||
                (product as any).vendorId ||
                ''
            );
            return brandId === vendorId;
        });

        // Count products and stock
        vendorProducts.forEach(product => {
            try {
                const productDate = extractDate((product as any).createdAt) || extractDate((product as any).exactDate);
                if (!productDate) return;

                const productYear = productDate.getFullYear();
                const productMonth = productDate.getMonth() + 1;

                if (productYear === currentYear) {
                    monthlyMap[productMonth].productCount += 1;

                    // Calculate total stock across branches
                    let totalStock = 0;
                    if (product.branches) {
                        const branchesEntries = Object.entries(product.branches);
                        for (const [_, branchData] of branchesEntries) {
                            if (branchData && typeof branchData === 'object') {
                                const inStock = typeof branchData.inStock === 'number' ? branchData.inStock : 0;
                                totalStock += inStock;
                            }
                        }
                    }
                    monthlyMap[productMonth].inStockCount += totalStock;
                }
            } catch (error) {
                console.error("Error processing product:", error);
            }
        });

        // Process vendor's orders
        let vendorOrders = orders.filter(order => {
            const orderId = String(
                (order as any).vendorID ||
                (order as any).vendorId ||
                ''
            );
            return orderId === vendorId;
        });

        let totalOrderValue = 0;
        let totalOrderCount = 0;

        // Extract customer demographics from this vendor's orders
        const locationCounts: Record<string, number> = {};

        vendorOrders.forEach(order => {
            try {
                // Safely extract the address
                if ((order as any).address && typeof (order as any).address === 'object' && (order as any).address.address) {
                    // Get the first word from the address
                    const addressStr = String((order as any).address.address);
                    const firstWord = addressStr.split(',')[0].trim().split(' ')[0].toLowerCase();

                    if (firstWord && firstWord.length > 1) { // Ignore very short words
                        locationCounts[firstWord] = (locationCounts[firstWord] || 0) + 1;
                    }
                }
            } catch (error) {
                console.error("Error processing order address:", error);
            }
        });

        // Sort locations by count and get top 5
        const sortedLocations = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: count }));

        // Take top 5 and group the rest as "Others"
        const topLocations = sortedLocations.slice(0, 5);
        const otherLocationsCount = sortedLocations.slice(5).reduce((sum, loc) => sum + loc.value, 0);

        if (otherLocationsCount > 0) {
            topLocations.push({ name: "Others", value: otherLocationsCount });
        }

        // Add colors to locations
        const locationColors = ['#44312D', '#654A43', '#876358', '#A47E71', '#C29A8A', '#E0B6A5'];
        const demographicsData = topLocations.map((loc, index) => ({
            ...loc,
            color: locationColors[index % locationColors.length]
        }));

        vendorOrders.forEach(order => {
            try {
                // Extract date
                const orderDate = extractDate((order as any).orderDate) || extractDate(order.createdAt);
                if (!orderDate) return;

                const orderYear = orderDate.getFullYear();
                const orderMonth = orderDate.getMonth() + 1;

                // Get order price
                let orderPrice = 0;
                if (typeof order.price === 'number' && order.price > 0) {
                    orderPrice = order.price;
                } else if (typeof (order as any).totalAmount === 'number' && (order as any).totalAmount > 0) {
                    orderPrice = (order as any).totalAmount;
                } else if (typeof (order as any).total === 'number' && (order as any).total > 0) {
                    orderPrice = (order as any).total;
                }

                if (orderPrice <= 0) return;

                totalOrderValue += orderPrice;
                totalOrderCount++;

                if (orderYear === currentYear) {
                    monthlyMap[orderMonth].orderCount += 1;
                    monthlyMap[orderMonth].orderValue += orderPrice;
                    monthlyMap[orderMonth]._orderValueSum += orderPrice;
                    monthlyMap[orderMonth]._totalValueSum += orderPrice;
                    monthlyMap[orderMonth].totalSalesValue += orderPrice;
                }
            } catch (error) {
                console.error("Error processing order:", error);
            }
        });

        // Process vendor's appointments
        let vendorAppointments = appointments.filter(appt => {
            const apptVendorId = String(
                (appt as any).vendorId ||
                (appt as any).vendorID ||
                ''
            );
            return apptVendorId === vendorId;
        });

        let totalAppointmentValue = 0;
        let totalAppointmentCount = 0;
        let soldAppointmentCount = 0;

        vendorAppointments.forEach(appt => {
            try {
                // Extract date
                const apptDate = extractDate(appt.createdAt) || extractDate((appt as any).exactDate);
                if (!apptDate) return;

                const apptYear = apptDate.getFullYear();
                const apptMonth = apptDate.getMonth() + 1;

                // Count appointment
                totalAppointmentCount++;

                if (apptYear === currentYear) {
                    monthlyMap[apptMonth].appointmentCount += 1;

                    // Get appointment price and check if it was sold
                    const apptPrice = typeof appt.productPrice === 'number' ? appt.productPrice : 0;
                    const isSold = appt.saleStatus === 'Sold';

                    if (isSold) {
                        soldAppointmentCount++;
                        monthlyMap[apptMonth].soldAppointmentCount += 1;

                        // Add sold appointment value
                        totalAppointmentValue += apptPrice;
                        monthlyMap[apptMonth].appointmentValue += apptPrice;
                        monthlyMap[apptMonth]._appointmentValueSum += apptPrice;
                        monthlyMap[apptMonth]._totalValueSum += apptPrice;
                        monthlyMap[apptMonth].totalSalesValue += apptPrice;
                    }
                }
            } catch (error) {
                console.error("Error processing appointment:", error);
            }
        });

        // Calculate averages for each month
        for (let i = 1; i <= 12; i++) {
            const orderCount = monthlyMap[i].orderCount;
            const totalTransactions = orderCount + monthlyMap[i].soldAppointmentCount;

            // Calculate average order value
            monthlyMap[i].avgOrderValue = orderCount > 0 ?
                monthlyMap[i]._orderValueSum / orderCount : 0;

            // Calculate average sales value (orders + appointments)
            monthlyMap[i].avgSalesValue = totalTransactions > 0 ?
                monthlyMap[i]._totalValueSum / totalTransactions : 0;
        }

        const monthlyChartData = Object.values(monthlyMap);

        // Calculate quarterly data
        const quarterlyData = [
            {
                period: 'Q1', revenue: 0, avgOrderValue: 0, avgSalesValue: 0, inStockCount: 0,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q2', revenue: 0, avgOrderValue: 0, avgSalesValue: 0, inStockCount: 0,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q3', revenue: 0, avgOrderValue: 0, avgSalesValue: 0, inStockCount: 0,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q4', revenue: 0, avgOrderValue: 0, avgSalesValue: 0, inStockCount: 0,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
        ];

        // Calculate quarterly aggregates
        for (let i = 1; i <= 12; i++) {
            const quarterIndex = Math.floor((i - 1) / 3);
            const month = monthlyMap[i];

            quarterlyData[quarterIndex].revenue += month.revenue;
            quarterlyData[quarterIndex].inStockCount += month.inStockCount / 3; // Average for quarter

            // Order data
            quarterlyData[quarterIndex].orderCount += month.orderCount;
            quarterlyData[quarterIndex].orderValueSum += month._orderValueSum;

            // Appointment data
            quarterlyData[quarterIndex].appointmentCount += month.appointmentCount;
            quarterlyData[quarterIndex].soldAppointmentCount += month.soldAppointmentCount;
            quarterlyData[quarterIndex].appointmentValueSum += month._appointmentValueSum;

            // Combined totals
            quarterlyData[quarterIndex].totalTransactions += month.orderCount + month.soldAppointmentCount;
            quarterlyData[quarterIndex].totalValueSum += month._totalValueSum;
        }

        // Finalize quarterly data
        quarterlyData.forEach(q => {
            q.avgOrderValue = q.orderCount > 0 ? q.orderValueSum / q.orderCount : 0;
            q.avgSalesValue = q.totalTransactions > 0 ? q.totalValueSum / q.totalTransactions : 0;
        });

        // Current month data
        const currentMonthData = monthlyMap[currentMonth];
        const prevMonthData = monthlyMap[prevMonth];

        // Current quarter data
        const currentQuarterIndex = Math.floor((currentMonth - 1) / 3);
        const prevQuarterIndex = currentQuarterIndex > 0 ? currentQuarterIndex - 1 : 3;

        // Monthly calculations
        const monthlyRevenue = currentMonthData.revenue;
        const monthlyRevenueChange = calculatePercentageChange(prevMonthData.revenue, monthlyRevenue);

        const monthlyAvgOrderValue = currentMonthData.avgOrderValue;
        const prevMonthAvgOrderValue = prevMonthData.avgOrderValue;
        const monthlyAvgOrderValueChange = calculatePercentageChange(prevMonthAvgOrderValue, monthlyAvgOrderValue);

        const monthlyAvgSalesValue = currentMonthData.avgSalesValue;
        const prevMonthAvgSalesValue = prevMonthData.avgSalesValue;
        const monthlyAvgSalesValueChange = calculatePercentageChange(prevMonthAvgSalesValue, monthlyAvgSalesValue);

        const monthlyInStockCount = currentMonthData.inStockCount;
        const prevMonthInStockCount = prevMonthData.inStockCount;
        const monthlyInStockCountChange = calculatePercentageChange(prevMonthInStockCount, monthlyInStockCount);

        // Quarterly calculations
        const quarterlyRevenue = quarterlyData[currentQuarterIndex].revenue;
        const prevQuarterlyRevenue = quarterlyData[prevQuarterIndex].revenue;
        const quarterlyRevenueChange = calculatePercentageChange(prevQuarterlyRevenue, quarterlyRevenue);

        const quarterlyAvgOrderValue = quarterlyData[currentQuarterIndex].avgOrderValue;
        const prevQuarterlyAvgOrderValue = quarterlyData[prevQuarterIndex].avgOrderValue;
        const quarterlyAvgOrderValueChange = calculatePercentageChange(prevQuarterlyAvgOrderValue, quarterlyAvgOrderValue);

        const quarterlyAvgSalesValue = quarterlyData[currentQuarterIndex].avgSalesValue;
        const prevQuarterlyAvgSalesValue = quarterlyData[prevQuarterIndex].avgSalesValue;
        const quarterlyAvgSalesValueChange = calculatePercentageChange(prevQuarterlyAvgSalesValue, quarterlyAvgSalesValue);

        const quarterlyInStockCount = quarterlyData[currentQuarterIndex].inStockCount;
        const prevQuarterlyInStockCount = quarterlyData[prevQuarterIndex].inStockCount;
        const quarterlyInStockCountChange = calculatePercentageChange(prevQuarterlyInStockCount, quarterlyInStockCount);

        // Yearly calculations
        // Calculate yearly revenue
        const yearlyRevenue = monthlyChartData.reduce((sum, month) => sum + month.revenue, 0);

        // Calculate yearly average order value
        const totalYearlyOrderCount = monthlyChartData.reduce((sum, month) => sum + month.orderCount, 0);
        const totalYearlyOrderValue = monthlyChartData.reduce((sum, month) => sum + month._orderValueSum, 0);
        const yearlyAvgOrderValue = totalYearlyOrderCount > 0 ?
            totalYearlyOrderValue / totalYearlyOrderCount : 0;

        // Calculate yearly average sales value
        const totalYearlySoldAppointmentCount = monthlyChartData.reduce((sum, month) => sum + month.soldAppointmentCount, 0);
        const totalYearlyTransactions = totalYearlyOrderCount + totalYearlySoldAppointmentCount;
        const totalYearlyAppointmentValue = monthlyChartData.reduce((sum, month) => sum + month._appointmentValueSum, 0);
        const totalYearlyValue = totalYearlyOrderValue + totalYearlyAppointmentValue;
        const yearlyAvgSalesValue = totalYearlyTransactions > 0 ?
            totalYearlyValue / totalYearlyTransactions : 0;

        // Calculate yearly in-stock average
        const yearlyInStockCount = monthlyChartData.reduce((sum, month) => sum + month.inStockCount, 0) / 12;

        // No previous year data for comparison in this example
        const yearlyRevenueChange = null;
        const yearlyAvgOrderValueChange = null;
        const yearlyAvgSalesValueChange = null;
        const yearlyInStockCountChange = null;

        // Calculate total sales
        const totalSales = totalOrderValue + totalAppointmentValue;

        // Calculate changes for chart details
        const orderValueChange = calculatePercentageChange(
            prevMonthData._orderValueSum,
            currentMonthData._orderValueSum
        );

        const appointmentValueChange = calculatePercentageChange(
            prevMonthData._appointmentValueSum,
            currentMonthData._appointmentValueSum
        );

        const orderCountChange = calculatePercentageChange(
            prevMonthData.orderCount,
            currentMonthData.orderCount
        );

        const appointmentCountChange = calculatePercentageChange(
            prevMonthData.appointmentCount,
            currentMonthData.appointmentCount
        );

        return {
            grossProfit: {
                monthly: { value: monthlyRevenue, change: monthlyRevenueChange },
                quarterly: { value: quarterlyRevenue, change: quarterlyRevenueChange },
                yearly: { value: yearlyRevenue, change: yearlyRevenueChange }
            },
            avgOrderValue: {
                monthly: { value: monthlyAvgOrderValue, change: monthlyAvgOrderValueChange },
                quarterly: { value: quarterlyAvgOrderValue, change: quarterlyAvgOrderValueChange },
                yearly: { value: yearlyAvgOrderValue, change: yearlyAvgOrderValueChange }
            },
            avgSalesValue: {
                monthly: { value: monthlyAvgSalesValue, change: monthlyAvgSalesValueChange },
                quarterly: { value: quarterlyAvgSalesValue, change: quarterlyAvgSalesValueChange },
                yearly: { value: yearlyAvgSalesValue, change: yearlyAvgSalesValueChange }
            },
            capital: {
                monthly: { value: monthlyInStockCount, change: monthlyInStockCountChange },
                quarterly: { value: quarterlyInStockCount, change: quarterlyInStockCountChange },
                yearly: { value: yearlyInStockCount, change: yearlyInStockCountChange }
            },
            monthlyChartData,
            totalSales: {
                value: totalSales,
                change: null,
                orderValue: totalOrderValue,
                appointmentValue: totalAppointmentValue
            },
            totalOrders: {
                value: totalOrderCount,
                change: orderCountChange
            },
            totalAppointments: {
                value: totalAppointmentCount,
                change: appointmentCountChange
            },
            totalProducts: {
                value: vendorProducts.length,
                change: null
            },
            vendorCount: {
                total: 1,
                gold: vendor?.chosenShopStyle?.toLowerCase().includes('gold') ? 1 : 0,
                silver: vendor?.chosenShopStyle?.toLowerCase().includes('silver') ? 1 : 0,
                raw: (!vendor?.chosenShopStyle || (!vendor.chosenShopStyle.toLowerCase().includes('gold') && !vendor.chosenShopStyle.toLowerCase().includes('silver'))) ? 1 : 0
            },
            userCount: 0, // Vendor-specific dashboard doesn't track users
            salesDetails: {
                orderValue: totalOrderValue,
                orderChange: orderValueChange,
                apptValue: totalAppointmentValue,
                apptChange: appointmentValueChange
            },
            ordersDetails: {
                gold: 0, // These could be filled in if we want to track order types
                goldChange: null,
                silver: 0,
                silverChange: null,
                raw: 0,
                rawChange: null
            },
            appointmentsDetails: {
                sale: soldAppointmentCount,
                saleChange: null,
                noSale: totalAppointmentCount - soldAppointmentCount,
                noSaleChange: null
            },
            demographicsData,
            // ... other fields from home dashboard if needed
        };
    }, [bills, vendors, products, orders, appointments, vendorId, selectedYear]);

    // Helper to get the right data based on selected time period
    const getValueByTimePeriod = (data: any, timePeriod: TimePeriod) => {
        return data[timePeriod]?.value || 0;
    }

    const getChangeByTimePeriod = (data: any, timePeriod: TimePeriod) => {
        return data[timePeriod]?.change || null;
    }

    // Function to handle printing the report
    const handlePrintReport = () => {
        // Print the dashboard section
        window.print();
    };

    // Add print-specific styles
    const printStyles = `
        @media print {
            body * {
                visibility: hidden;
            }
            .dashboard-container, .dashboard-container * {
                visibility: visible;
            }
            .dashboard-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .no-print {
                display: none !important;
            }
            .report-title {
                display: block !important;
                text-align: center;
                margin-bottom: 20px;
                font-size: 24px;
                font-weight: bold;
            }
            .chart-container {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            @page {
                size: A4;
                margin: 1cm;
            }
        }
    `;

    // Year selector component
    const YearSelector = () => (
        <div className="flex justify-between items-center mb-4">
            <Button
                onClick={handlePrintReport}
                className="no-print flex items-center gap-2 bg-[#44312D] hover:bg-[#5a4540]"
            >
                <Printer className="h-4 w-4" />
                Issue Report
            </Button>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    // Get vendor name
    const vendor = vendors.find(v => String(v._id) === vendorId);
    // Extract the name safely - use 'as any' for accessing potential businessName property
    const vendorName = vendor?.name || (vendor as any)?.businessName || 'Vendor';

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            <div className="space-y-6 dashboard-container" ref={reportRef}>
                <YearSelector />

                {/* Report Title - only visible when printing */}
                <h1 className="report-title hidden">
                    {vendorName} Performance Report - {selectedYear}
                </h1>

                {/* Summary Cards - Same as home dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SummaryCard
                        title="Gross Profit"
                        value={formatCurrency(getValueByTimePeriod(processedData.grossProfit, grossProfitTimePeriod))}
                        change={getChangeByTimePeriod(processedData.grossProfit, grossProfitTimePeriod)}
                        timePeriod={grossProfitTimePeriod}
                        onTimePeriodChange={setGrossProfitTimePeriod}
                    />
                    <SummaryCard
                        title="Average Sales"
                        value={formatCurrency(getValueByTimePeriod(processedData.avgSalesValue, avgSalesTimePeriod))}
                        change={getChangeByTimePeriod(processedData.avgSalesValue, avgSalesTimePeriod)}
                        timePeriod={avgSalesTimePeriod}
                        onTimePeriodChange={setAvgSalesTimePeriod}
                    />
                    <SummaryCard
                        title="Capital"
                        value={formatCurrency(getValueByTimePeriod(processedData.capital, capitalTimePeriod))}
                        change={getChangeByTimePeriod(processedData.capital, capitalTimePeriod)}
                        timePeriod={capitalTimePeriod}
                        onTimePeriodChange={setCapitalTimePeriod}
                    />
                </div>

                {/* Chart Cards - Same as home dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <DashboardChartCard
                        title="Total Sales"
                        totalValue={formatCurrency(processedData.totalSales.value)}
                        totalChange={processedData.totalSales.change}
                        data={processedData.monthlyChartData}
                        dataKey="totalSalesValue"
                        details={
                            <>
                                <StatItem label="Order Sales" value={processedData.salesDetails.orderValue} percentage={processedData.salesDetails.orderChange} iconType="currency" />
                                <StatItem label="Appointment Sales" value={processedData.salesDetails.apptValue} percentage={processedData.salesDetails.apptChange} iconType="currency" />
                            </>
                        }
                    />
                    <DashboardChartCard
                        title="Total Orders"
                        totalValue={processedData.totalOrders.value}
                        totalChange={processedData.totalOrders.change}
                        data={processedData.monthlyChartData}
                        dataKey="orderCount"
                        yTickFormatter={(val) => val.toString()}
                        details={
                            <>
                                <StatItem label="Gold Orders" value={processedData.ordersDetails.gold} percentage={processedData.ordersDetails.goldChange} iconType="count" />
                                <StatItem label="Silver Orders" value={processedData.ordersDetails.silver} percentage={processedData.ordersDetails.silverChange} iconType="count" />
                                <StatItem label="Raw Orders" value={processedData.ordersDetails.raw} percentage={processedData.ordersDetails.rawChange} iconType="count" />
                            </>
                        }
                    />
                    <DashboardChartCard
                        title="Total Appointments"
                        totalValue={processedData.totalAppointments.value}
                        totalChange={processedData.totalAppointments.change}
                        data={processedData.monthlyChartData}
                        dataKey="appointmentCount"
                        yTickFormatter={(val) => val.toString()}
                        details={
                            <>
                                <StatItem label="Sale Appointments" value={processedData.appointmentsDetails.sale} percentage={processedData.appointmentsDetails.saleChange} iconType="count" />
                                <StatItem label="No-Sale Appointments" value={processedData.appointmentsDetails.noSale} percentage={processedData.appointmentsDetails.noSaleChange} iconType="count" />
                            </>
                        }
                    />
                    <DashboardChartCard
                        title="Avg. Order Value"
                        totalValue={formatCurrency(processedData.avgOrderValue.monthly.value)}
                        totalChange={processedData.avgOrderValue.monthly.change}
                        data={processedData.monthlyChartData}
                        dataKey="avgOrderValue"
                        details={null}
                    />
                    <DashboardChartCard
                        title="Vendors"
                        totalValue={processedData.vendorCount.total}
                        totalChange={null}
                        data={processedData.monthlyChartData}
                        dataKey="vendorCount"
                        yTickFormatter={(val) => val.toString()}
                        details={
                            <>
                                <StatItem label="Gold" value={processedData.vendorCount.gold} percentage={null} iconType="count" />
                                <StatItem label="Silver" value={processedData.vendorCount.silver} percentage={null} iconType="count" />
                                <StatItem label="Raw" value={processedData.vendorCount.raw} percentage={null} iconType="count" />
                            </>
                        }
                    />
                    <DashboardChartCard
                        title="Products"
                        totalValue={processedData.totalProducts.value}
                        totalChange={null}
                        data={processedData.monthlyChartData}
                        dataKey="productCount"
                        yTickFormatter={(val) => val.toString()}
                        details={null}
                    />
                    <DemographicPieCard
                        title="Customer Demographics"
                        data={processedData.demographicsData}
                    />
                </div>
            </div>
        </>
    );
} 