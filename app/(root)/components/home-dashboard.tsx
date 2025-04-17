'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Use ShadCN Card
import { ArrowUp, ArrowDown } from 'lucide-react'; // Import icons
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'; // Import recharts
import Image from "next/image"; // For custom arrows
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select for time period

// Import actions & utils
import { getBills } from '@/lib/actions/bill-actions';
import { getVendors } from '@/lib/actions/vendor-actions';
import { getAllProductsForCapital } from '@/lib/actions/product-actions'; // Use specific action
import { getOrders } from '@/lib/actions/order-actions'; // Assumed
import { getAppointments } from '@/lib/actions/appointment-actions'; // Assumed
import { getUsers } from '@/lib/actions/user-actions';
import { getVendorCategory } from '@/lib/vendor-utils';
import { formatCurrency, calculatePercentageChange, formatDate } from '@/lib/utils';
import { IProduct } from '@/models/Product'; // Assuming Product model interface
import { IVendor } from '@/models/Vendor'; // Assuming Vendor model interface
import { IUser } from '@/models/User'; // Assuming User model interface
import { IUserOrder as IOrder } from '@/models/UserOrder'; // Corrected Import
import { IAppointment } from '@/models/Appointment'; // Assuming Appointment model interface
import { IBill } from '@/models/Bill'; // Assuming Bill model interface

// --- Helper Functions & Types --- 
const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('default', { month: 'short' });
};

// Define time period type
type TimePeriod = 'monthly' | 'quarterly' | 'yearly';

// Define types for processed data (example)
type MonthlySummary = {
    month: number;
    monthName: string;
    billRevenue: number;
    billSales: number; // Keep this for backward compatibility
    orderValue: number;
    orderCount: number;
    appointmentCount: number;
    appointmentValue: number;
    soldAppointmentCount: number;
    avgOrderCost: number;
    avgSalesCost: number;
    totalSalesValue: number; // Combined orders + appointments
    // Add more monthly aggregates as needed
};

type ProductCapitalData = {
    _id: string;
    price?: number;
    branches?: Record<string, { inStock?: number }>;
};

type LeanVendor = Omit<IVendor, 'branches'> & { branches?: Record<string, string> }; // Example lean type
type LeanUser = Omit<IUser, 'addresses'> & { addresses?: Record<string, any> }; // Example lean type

// --- Reusable Components (Styled like finance/analytics-tab) --- 

// Adapted SegmentStat from finance/analytics-tab.tsx
function StatItem({ label, value, percentage, iconType }: {
    label: string;
    value: string | number;
    percentage: number | null;
    iconType?: 'currency' | 'count' | 'none'; // Optional: Add icons later
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

// Summary Card (Top row)
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
                    <p className="text-xs text-gray-500">--</p> // Placeholder if no change calc
                )}
            </CardContent>
        </Card>
    );
}

// Chart Card (Adapted from finance/analytics-tab.tsx)
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
    const strokeColor = '#44312D'; // Use primary color
    const iconColor = totalChange === null ? 'text-gray-500' : totalChange >= 0 ? 'text-green-600' : 'text-red-600';

    // Default formatters for different data types
    const formatCurrencyValue = (value: number) => formatCurrency(value).replace(/EGP\s?/, '');
    const formatCountValue = (value: number) => value.toString();

    // Determine the right formatter based on the title or dataKey
    const getDefaultFormatter = () => {
        const isCountGraph =
            title.includes('Orders') ||
            title.includes('Appointments') ||
            title.includes('Users') ||
            title.includes('Vendors') ||
            dataKey.includes('Count') ||
            dataKey === 'orderCount' ||
            dataKey === 'appointmentCount' ||
            dataKey === 'userCount' ||
            dataKey === 'vendorCount';

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
                                        name === 'userCount' ||
                                        name === 'vendorCount' ||
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

// Number Card (For Vendors, Users)
function NumberCard({ title, value, children }: { title: string, value: number, children?: React.ReactNode }) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-gray-700">{title}</CardTitle>
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                <p className="text-xs text-muted-foreground">Total Count</p> { /* Simple description */}
            </CardHeader>
            {children && (
                <CardContent className="pt-0">
                    <div className="mt-1 space-y-1 text-sm border-t pt-3">{children}</div>
                </CardContent>
            )}
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

// --- Main Dashboard Component --- 
export default function HomeDashboard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("all");
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [grossProfitTimePeriod, setGrossProfitTimePeriod] = useState<TimePeriod>('monthly');
    const [avgSalesTimePeriod, setAvgSalesTimePeriod] = useState<TimePeriod>('monthly');
    const [capitalTimePeriod, setCapitalTimePeriod] = useState<TimePeriod>('monthly');

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["all", "interactions", "financial"].includes(tab)) {
            setActiveTab(tab);
        } else if (!tab) {
            setActiveTab("all");
        }
    }, [searchParams]);

    // --- Fetch Data (Use any[] for complex/lean types, ensure array after fetch) --- 
    const { data: billsData = [] } = useSuspenseQuery<IBill[]>({ queryKey: ['bills'], queryFn: getBills });
    const { data: vendorsData = [] } = useSuspenseQuery<any[]>({ queryKey: ['vendors'], queryFn: getVendors }); // Use any[]
    const { data: productsData = [] } = useSuspenseQuery<ProductCapitalData[]>({ queryKey: ['productsCapital'], queryFn: getAllProductsForCapital });
    const { data: ordersData = [] } = useSuspenseQuery<any[]>({ queryKey: ['orders'], queryFn: getOrders });  // Use any[]
    const { data: appointmentsData = [] } = useSuspenseQuery<any[]>({ queryKey: ['appointments'], queryFn: getAppointments }); // Use any[]
    const { data: usersData = [] } = useSuspenseQuery<any[]>({ queryKey: ['users'], queryFn: getUsers }); // Use any[]

    // Ensure data are arrays before processing
    const bills: IBill[] = Array.isArray(billsData) ? billsData : [];
    const vendors: IVendor[] = Array.isArray(vendorsData) ? vendorsData : []; // Cast back to IVendor for useMemo, acknowledging potential lean issues
    const products: ProductCapitalData[] = Array.isArray(productsData) ? productsData : [];
    const orders: IOrder[] = Array.isArray(ordersData) ? ordersData : []; // Cast back
    const appointments: IAppointment[] = Array.isArray(appointmentsData) ? appointmentsData : []; // Cast back
    const users: IUser[] = Array.isArray(usersData) ? usersData : []; // Cast back

    // --- Data Processing (Add explicit casts and checks inside) --- 
    const processedData = useMemo(() => {
        // Use the selected year instead of current year
        const currentYear = selectedYear;
        const currentMonth = new Date().getMonth() + 1; // 1-12 format
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

        // Monthly Aggregates Map
        const monthlyMap: Record<number, MonthlySummary & { [key: string]: any }> = {};
        for (let i = 1; i <= 12; i++) {
            monthlyMap[i] = {
                month: i, monthName: getMonthName(i),
                billRevenue: 0, billSales: 0, orderValue: 0, orderCount: 0,
                appointmentCount: 0, appointmentValue: 0, soldAppointmentCount: 0,
                avgOrderCost: 0, avgSalesCost: 0, totalSalesValue: 0,
                _orderValueSum: 0, _appointmentValueSum: 0, _totalValueSum: 0,
                goldOrders: 0, silverOrders: 0, rawOrders: 0,
                saleAppointments: 0, noSaleAppointments: 0,
                vendorCount: 0, userCount: 0,
            };
        }

        // Process Bills - with validation
        bills.forEach((bill) => {
            try {
                const billYear = typeof bill.year === 'number' ? bill.year : parseInt(String(bill.year));
                const billMonth = typeof bill.month === 'number' ? bill.month : parseInt(String(bill.month));

                if (!isNaN(billYear) && !isNaN(billMonth) && billYear === currentYear && billMonth >= 1 && billMonth <= 12) {
                    // Use default values of 0 for missing values
                    const rent = typeof bill.rent === 'number' ? bill.rent : 0;
                    const commission = typeof bill.commission === 'number' ? bill.commission : 0;
                    const totalSales = typeof bill.totalSales === 'number' ? bill.totalSales : 0;

                    // No longer capping values
                    monthlyMap[billMonth].billRevenue += rent + commission;
                    monthlyMap[billMonth].billSales += totalSales;
                }
            } catch (error) {
                console.error("Error processing bill:", error);
            }
        });

        // Create vendor map for quick lookups - with validation
        const vendorMap = vendors.reduce((acc: Record<string, IVendor>, v: IVendor) => {
            const id = String(v._id || '');
            if (id) acc[id] = v;
            return acc;
        }, {});

        // Get vendor category based on chosenShopStyle
        const getVendorCategory = (shopStyle: string): 'Gold' | 'Silver' | 'Raw' => {
            if (!shopStyle) return 'Raw';
            const shopStyleLower = shopStyle.toLowerCase();
            if (shopStyleLower.includes('gold')) return 'Gold';
            if (shopStyleLower.includes('silver')) return 'Silver';
            return 'Raw';
        };

        // Helper function to safely extract date from various formats
        const extractDate = (dateField: any): Date | null => {
            try {
                if (!dateField) return null;

                // Handle Firestore timestamp format
                if (dateField && typeof dateField === 'object' && '_seconds' in dateField) {
                    return new Date(dateField._seconds * 1000);
                }

                // Handle standard date object or string
                return new Date(dateField);
            } catch (error) {
                return null;
            }
        };

        // Calculate total capital from products - with improved error handling
        let totalCapital = 0;

        products.forEach((product) => {
            try {
                // Validate price is a number
                const price = typeof product.price === 'number' ? product.price : 0;
                if (price <= 0) return; // Skip products with invalid prices

                let totalStock = 0;

                // Safely handle branches in different formats
                if (product.branches) {
                    // Handle both Map and plain object cases
                    const branchesEntries = Object.entries(product.branches);

                    for (const [_, branchData] of branchesEntries) {
                        // Safely extract inStock value
                        if (branchData && typeof branchData === 'object') {
                            const inStock = typeof branchData.inStock === 'number' ? branchData.inStock : 0;
                            // No longer capping stock numbers
                            totalStock += inStock;
                        }
                    }
                }

                // Add to total capital without caps
                const productCapital = price * totalStock;
                totalCapital += productCapital;
            } catch (error) {
                console.error("Error processing product for capital:", error);
            }
        });

        // No longer capping total capital

        // Process Orders with improved price handling
        const goldOrders: any[] = [];
        const silverOrders: any[] = [];
        const rawOrders: any[] = [];
        let totalOrderValue = 0;
        let totalValidOrders = 0;

        orders.forEach((order) => {
            try {
                // Extract date properly using the helper function
                const orderDate = extractDate((order as any).orderDate) || extractDate(order.createdAt);
                if (!orderDate) return; // Skip orders without valid dates

                const orderYear = orderDate.getFullYear();
                const orderMonth = orderDate.getMonth() + 1; // 1-12

                // Consistent price extraction - use order.price directly
                let orderPrice = 0;
                if (typeof order.price === 'number' && order.price > 0) {
                    orderPrice = order.price;
                } else if (typeof (order as any).totalAmount === 'number' && (order as any).totalAmount > 0) {
                    orderPrice = (order as any).totalAmount;
                } else if (typeof (order as any).total === 'number' && (order as any).total > 0) {
                    orderPrice = (order as any).total;
                }

                // Filter out unreasonable values
                if (orderPrice <= 0) return; // Skip free orders
                // No longer capping order price

                totalOrderValue += orderPrice;
                totalValidOrders++;

                if (orderYear === currentYear && monthlyMap[orderMonth]) {
                    monthlyMap[orderMonth].orderCount += 1;
                    monthlyMap[orderMonth].orderValue += orderPrice;
                    monthlyMap[orderMonth]._orderValueSum += orderPrice;
                    monthlyMap[orderMonth]._totalValueSum += orderPrice;
                    monthlyMap[orderMonth].totalSalesValue += orderPrice; // Add to total sales

                    // Extract vendor ID consistently with fallbacks
                    const vendorId = String(
                        (order as any).vendorID ||
                        (order as any).vendorId ||
                        (order as any).vendor_id ||
                        (order as any).vendorid ||
                        (order as any).brandID ||
                        (order as any).brandId ||
                        ''
                    );

                    // Categorize order by vendor type
                    const vendor = vendorId ? vendorMap[vendorId] : null;

                    if (vendor && vendor.chosenShopStyle) {
                        const category = getVendorCategory(vendor.chosenShopStyle);

                        if (category === 'Gold') {
                            goldOrders.push(order);
                            monthlyMap[orderMonth].goldOrders += 1;
                        } else if (category === 'Silver') {
                            silverOrders.push(order);
                            monthlyMap[orderMonth].silverOrders += 1;
                        } else {
                            rawOrders.push(order);
                            monthlyMap[orderMonth].rawOrders += 1;
                        }
                    } else {
                        // Default to raw orders if no vendor or shop style
                        rawOrders.push(order);
                        monthlyMap[orderMonth].rawOrders += 1;
                    }
                }
            } catch (error) {
                console.error("Error processing order:", error);
            }
        });

        // Process appointments with improved status handling
        let saleAppointmentsCount = 0;
        let noSaleAppointmentsCount = 0;
        let totalAppointmentValue = 0;

        appointments.forEach((appt) => {
            try {
                // Extract date using helper function
                const apptDate = extractDate(appt.createdAt);
                if (!apptDate) return; // Skip appointments without valid dates

                const apptYear = apptDate.getFullYear();
                const apptMonth = apptDate.getMonth() + 1; // 1-12

                if (apptYear === currentYear && monthlyMap[apptMonth]) {
                    monthlyMap[apptMonth].appointmentCount += 1;

                    // Get appointment price
                    const apptPrice = typeof appt.productPrice === 'number' ? appt.productPrice : 0;

                    // Check saleStatus field specifically for "Sold"
                    const isSold = appt.saleStatus === 'Sold';

                    if (isSold) {
                        saleAppointmentsCount++;
                        monthlyMap[apptMonth].saleAppointments += 1;
                        monthlyMap[apptMonth].soldAppointmentCount += 1;

                        // Only add to sales value if it was sold
                        monthlyMap[apptMonth].appointmentValue += apptPrice;
                        monthlyMap[apptMonth]._appointmentValueSum += apptPrice;
                        monthlyMap[apptMonth]._totalValueSum += apptPrice;
                        monthlyMap[apptMonth].totalSalesValue += apptPrice;
                        totalAppointmentValue += apptPrice;
                    } else {
                        noSaleAppointmentsCount++;
                        monthlyMap[apptMonth].noSaleAppointments += 1;
                    }
                }
            } catch (error) {
                console.error("Error processing appointment:", error);
            }
        });

        // Track vendor and user counts by month - with improved date handling
        vendors.forEach((vendor) => {
            try {
                // Extract date using helper function
                const vendorDate = extractDate(vendor.createdAt) || extractDate(vendor.joinDate);
                if (!vendorDate) return; // Skip vendors without valid dates

                const vendorYear = vendorDate.getFullYear();
                const vendorMonth = vendorDate.getMonth() + 1; // 1-12

                if (vendorYear === currentYear && monthlyMap[vendorMonth]) {
                    monthlyMap[vendorMonth].vendorCount += 1;
                }
            } catch (error) {
                console.error("Error processing vendor:", error);
            }
        });

        users.forEach((user) => {
            try {
                // Extract date using helper function
                const userDate = extractDate(user.createdAt);
                if (!userDate) return; // Skip users without valid dates

                const userYear = userDate.getFullYear();
                const userMonth = userDate.getMonth() + 1; // 1-12

                if (userYear === currentYear && monthlyMap[userMonth]) {
                    monthlyMap[userMonth].userCount += 1;
                }
            } catch (error) {
                console.error("Error processing user:", error);
            }
        });

        // Calculate averages for each month - with validation
        for (let i = 1; i <= 12; i++) {
            const orderCount = monthlyMap[i].orderCount;
            const totalTransactions = orderCount + monthlyMap[i].soldAppointmentCount;

            // Avoid division by zero for order average
            monthlyMap[i].avgOrderCost = orderCount > 0 ?
                monthlyMap[i]._orderValueSum / orderCount : 0; // No longer capping average

            // Avoid division by zero for overall sales average (orders + appointments)
            monthlyMap[i].avgSalesCost = totalTransactions > 0 ?
                monthlyMap[i]._totalValueSum / totalTransactions : 0; // No longer capping average
        }

        const monthlyChartData = Object.values(monthlyMap);

        // Calculate quarterly data with improved aggregation
        const quarterlyData = [
            {
                period: 'Q1', grossProfit: 0, avgOrderValue: 0, avgSalesValue: 0, capital: totalCapital,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q2', grossProfit: 0, avgOrderValue: 0, avgSalesValue: 0, capital: totalCapital,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q3', grossProfit: 0, avgOrderValue: 0, avgSalesValue: 0, capital: totalCapital,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
            {
                period: 'Q4', grossProfit: 0, avgOrderValue: 0, avgSalesValue: 0, capital: totalCapital,
                orderCount: 0, orderValueSum: 0,
                appointmentCount: 0, soldAppointmentCount: 0, appointmentValueSum: 0,
                totalTransactions: 0, totalValueSum: 0
            },
        ];

        // Calculate quarterly aggregates
        for (let i = 1; i <= 12; i++) {
            const quarterIndex = Math.floor((i - 1) / 3);
            const month = monthlyMap[i];

            quarterlyData[quarterIndex].grossProfit += month.billRevenue;

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

        // Finalize quarterly data with validation
        quarterlyData.forEach(q => {
            // Avoid division by zero for orders and no longer capping
            q.avgOrderValue = q.orderCount > 0 ?
                q.orderValueSum / q.orderCount : 0;

            // Avoid division by zero for sales (orders + appointments) and no longer capping
            q.avgSalesValue = q.totalTransactions > 0 ?
                q.totalValueSum / q.totalTransactions : 0;
        });

        // Current period calculations with validation
        const currentQuarterIndex = Math.floor((currentMonth - 1) / 3);
        const prevQuarterIndex = currentQuarterIndex > 0 ? currentQuarterIndex - 1 : 3; // Wrap to Q4 of previous year

        // Monthly data for current and previous months
        const currentMonthData = monthlyMap[currentMonth];
        const prevMonthData = monthlyMap[prevMonth];

        // Monthly calculations with validation 
        const monthlyGrossProfit = currentMonthData.billRevenue;
        // Use null for percentage change when previous value is 0 to avoid infinity
        const monthlyGrossProfitChange = calculatePercentageChange(prevMonthData.billRevenue, monthlyGrossProfit);

        // Calculate monthly average order value with validation
        const monthlyAvgOrderValue = currentMonthData.avgOrderCost;
        const prevMonthAvgOrderValue = prevMonthData.avgOrderCost;
        const monthlyAvgOrderValueChange = calculatePercentageChange(prevMonthAvgOrderValue, monthlyAvgOrderValue);

        // Calculate monthly average sales value (orders + appointments)
        const monthlyAvgSalesValue = currentMonthData.avgSalesCost;
        const prevMonthAvgSalesValue = prevMonthData.avgSalesCost;
        const monthlyAvgSalesValueChange = calculatePercentageChange(prevMonthAvgSalesValue, monthlyAvgSalesValue);

        // Quarterly calculations with validation
        const quarterlyGrossProfit = quarterlyData[currentQuarterIndex].grossProfit;
        const prevQuarterlyGrossProfit = quarterlyData[prevQuarterIndex].grossProfit;
        const quarterlyGrossProfitChange = calculatePercentageChange(prevQuarterlyGrossProfit, quarterlyGrossProfit);

        const quarterlyAvgOrderValue = quarterlyData[currentQuarterIndex].avgOrderValue;
        const prevQuarterlyAvgOrderValue = quarterlyData[prevQuarterIndex].avgOrderValue;
        const quarterlyAvgOrderValueChange = calculatePercentageChange(prevQuarterlyAvgOrderValue, quarterlyAvgOrderValue);

        const quarterlyAvgSalesValue = quarterlyData[currentQuarterIndex].avgSalesValue;
        const prevQuarterlyAvgSalesValue = quarterlyData[prevQuarterIndex].avgSalesValue;
        const quarterlyAvgSalesValueChange = calculatePercentageChange(prevQuarterlyAvgSalesValue, quarterlyAvgSalesValue);

        // Yearly calculations with validation
        const yearlyGrossProfit = bills.reduce((sum, bill) => {
            if (bill.year === currentYear) {
                const rent = typeof bill.rent === 'number' ? bill.rent : 0;
                const commission = typeof bill.commission === 'number' ? bill.commission : 0;
                return sum + rent + commission;
            }
            return sum;
        }, 0);

        const prevYearGrossProfit = bills.reduce((sum, bill) => {
            if (bill.year === currentYear - 1) {
                const rent = typeof bill.rent === 'number' ? bill.rent : 0;
                const commission = typeof bill.commission === 'number' ? bill.commission : 0;
                return sum + rent + commission;
            }
            return sum;
        }, 0);

        const yearlyGrossProfitChange = calculatePercentageChange(prevYearGrossProfit, yearlyGrossProfit);

        // Calculate yearly average order value - no longer capping
        const totalYearlyOrderCount = monthlyChartData.reduce((sum, month) => sum + month.orderCount, 0);
        const totalYearlyOrderValue = monthlyChartData.reduce((sum, month) => sum + month._orderValueSum, 0);
        const yearlyAvgOrderValue = totalYearlyOrderCount > 0 ?
            totalYearlyOrderValue / totalYearlyOrderCount : 0;

        // Calculate yearly average sales value (orders + appointments) - no longer capping
        const totalYearlySoldAppointmentCount = monthlyChartData.reduce((sum, month) => sum + month.soldAppointmentCount, 0);
        const totalYearlyTransactions = totalYearlyOrderCount + totalYearlySoldAppointmentCount;
        const totalYearlyAppointmentValue = monthlyChartData.reduce((sum, month) => sum + month._appointmentValueSum, 0);
        const totalYearlyValue = totalYearlyOrderValue + totalYearlyAppointmentValue;
        const yearlyAvgSalesValue = totalYearlyTransactions > 0 ?
            totalYearlyValue / totalYearlyTransactions : 0;

        // Calculate yearly average changes
        const yearlyAvgOrderValueChange = calculatePercentageChange(prevMonthAvgOrderValue, yearlyAvgOrderValue);
        const yearlyAvgSalesValueChange = calculatePercentageChange(prevMonthAvgSalesValue, yearlyAvgSalesValue);

        // Calculate total bill sales with validation - now a direct sum from data
        const totalSales = totalOrderValue + totalAppointmentValue;

        // Calculate percentage changes for order and appointment counts
        const totalOrdersChange = calculatePercentageChange(
            prevMonthData.orderCount,
            currentMonthData.orderCount
        );

        const totalAppointmentsChange = calculatePercentageChange(
            prevMonthData.appointmentCount,
            currentMonthData.appointmentCount
        );

        const orderSalesChange = calculatePercentageChange(
            prevMonthData.orderValue,
            currentMonthData.orderValue
        );

        const appointmentSalesChange = calculatePercentageChange(
            prevMonthData._appointmentValueSum,
            currentMonthData._appointmentValueSum
        );

        // Category percentages with validation
        const goldOrdersChange = calculatePercentageChange(
            prevMonthData.goldOrders,
            currentMonthData.goldOrders
        );

        const silverOrdersChange = calculatePercentageChange(
            prevMonthData.silverOrders,
            currentMonthData.silverOrders
        );

        const rawOrdersChange = calculatePercentageChange(
            prevMonthData.rawOrders,
            currentMonthData.rawOrders
        );

        // Count vendors by category
        let goldVendors = 0, silverVendors = 0, rawVendors = 0;
        vendors.forEach(vendor => {
            const category = getVendorCategory(vendor.chosenShopStyle || '');
            if (category === 'Gold') goldVendors++;
            else if (category === 'Silver') silverVendors++;
            else rawVendors++;
        });

        // Extract customer demographics from orders
        const locationCounts: Record<string, number> = {};

        orders.forEach(order => {
            try {
                // Safely extract the address
                if (order.address && typeof order.address === 'object' && order.address.address) {
                    // Get the first word from the address
                    const addressStr = String(order.address.address);
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

        // Return processed data for rendering
        return {
            grossProfit: {
                monthly: { value: monthlyGrossProfit, change: monthlyGrossProfitChange },
                quarterly: { value: quarterlyGrossProfit, change: quarterlyGrossProfitChange },
                yearly: { value: yearlyGrossProfit, change: yearlyGrossProfitChange }
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
                monthly: { value: totalCapital, change: null },
                quarterly: { value: totalCapital, change: null },
                yearly: { value: totalCapital, change: null }
            },
            monthlyChartData,
            totalSales: {
                value: totalSales,
                change: null,
                orderValue: totalOrderValue,
                appointmentValue: totalAppointmentValue
            },
            totalOrders: { value: orders.length, change: totalOrdersChange },
            totalAppointments: { value: appointments.length, change: totalAppointmentsChange },
            avgOrderCost: { value: yearlyAvgOrderValue, change: yearlyAvgOrderValueChange },
            vendorCount: { total: vendors.length, gold: goldVendors, silver: silverVendors, raw: rawVendors },
            userCount: users.length,
            salesDetails: {
                orderValue: totalOrderValue,
                orderChange: orderSalesChange,
                apptValue: totalAppointmentValue,
                apptChange: appointmentSalesChange
            },
            ordersDetails: {
                gold: goldOrders.length,
                goldChange: goldOrdersChange,
                silver: silverOrders.length,
                silverChange: silverOrdersChange,
                raw: rawOrders.length,
                rawChange: rawOrdersChange
            },
            appointmentsDetails: {
                sale: saleAppointmentsCount,
                saleChange: null,
                noSale: noSaleAppointmentsCount,
                noSaleChange: null
            },
            demographicsData,
        };
    }, [bills, vendors, products, orders, appointments, users, selectedYear]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const newUrl = `/?tab=${value}`;
        window.history.pushState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
    };

    // Helper to get the right data based on selected time period
    const getValueByTimePeriod = (data: any, timePeriod: TimePeriod) => {
        return data[timePeriod]?.value || 0;
    }

    const getChangeByTimePeriod = (data: any, timePeriod: TimePeriod) => {
        return data[timePeriod]?.change || null;
    }

    // Add a common row component for the year selector
    const YearSelector = () => (
        <div className="flex justify-end mb-4">
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

    // --- Render --- 
    return (
        <div className="py-6 w-full px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-fit mb-8 bg-transparent p-0">
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit mr-1 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600' value="all">All</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit mr-1 data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600' value="interactions">Interactions & Views</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600' value="financial">Financial Analytics</TabsTrigger>
                </TabsList>

                {/* --- All Tab --- */}
                <TabsContent value="all" className="mt-0 w-full space-y-6">
                    <YearSelector />
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
                            totalValue={formatCurrency(processedData.avgOrderCost.value)}
                            totalChange={processedData.avgOrderCost.change}
                            data={processedData.monthlyChartData}
                            dataKey="avgOrderCost"
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
                            title="Users"
                            totalValue={processedData.userCount}
                            totalChange={null}
                            data={processedData.monthlyChartData}
                            dataKey="userCount"
                            yTickFormatter={(val) => val.toString()}
                            details={null}
                        />
                        <DemographicPieCard
                            title="Customer Demographics"
                            data={processedData.demographicsData}
                        />
                    </div>
                </TabsContent>

                {/* --- Interactions & Views Tab --- */}
                <TabsContent value="interactions" className="mt-0 w-full">
                    <YearSelector />
                    <div className="p-6 border rounded bg-white shadow-sm text-center text-gray-500">
                        Interactions & Views analytics will be available in a future update.
                    </div>
                </TabsContent>

                {/* --- Financial Analytics Tab --- */}
                <TabsContent value="financial" className="mt-0 w-full">
                    <YearSelector />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <DashboardChartCard
                            title="Total Sales"
                            totalValue={formatCurrency(processedData.totalSales.value)}
                            totalChange={processedData.totalSales.change}
                            data={processedData.monthlyChartData}
                            dataKey="totalSalesValue"
                            details={null}
                        />
                        <DashboardChartCard
                            title="Avg. Order Value"
                            totalValue={formatCurrency(processedData.avgOrderCost.value)}
                            totalChange={processedData.avgOrderCost.change}
                            data={processedData.monthlyChartData}
                            dataKey="avgOrderCost"
                            details={null}
                        />
                        <DemographicPieCard
                            title="Customer Demographics"
                            data={processedData.demographicsData}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
} 