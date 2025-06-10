'use client';

import React, { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVendorBills, createBill, updateBill } from "@/lib/actions/bill-actions";
import { getVendorById, updateVendorRentAndCommission } from "@/lib/actions/vendor-actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getVendorCategory } from "@/lib/vendor-utils";
import { getQueryClient } from "@/lib/get-query-client";
import { useNotifications } from "@/providers/notification-provider";
import { useHasPermission } from "@/contexts/PermissionContext";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bell, Plus, Edit, Calendar, Edit2, Check, X } from "lucide-react";

interface VendorFinanceDetailProps {
    vendorId: string;
}

export default function VendorFinanceDetail({
    vendorId
}: VendorFinanceDetailProps) {
    // Fetch vendor data from the query cache
    const { data: vendor } = useSuspenseQuery({
        queryKey: ['vendor', vendorId],
        queryFn: () => getVendorById(vendorId)
    });

    // Fetch vendor bills from the query cache
    const { data: bills } = useSuspenseQuery({
        queryKey: ['vendorBills', vendorId],
        queryFn: () => getVendorBills(vendorId)
    });

    const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
    const [isCreateBillDialogOpen, setIsCreateBillDialogOpen] = useState(false);
    const [isEditBillDialogOpen, setIsEditBillDialogOpen] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationMessage, setNotificationMessage] = useState('');
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [newBillData, setNewBillData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        rent: vendor?.rent || 0,
        commission: 0,
        commissionPercentage: vendor?.commission || 0,
        totalSales: 0
    });
    const [editBillData, setEditBillData] = useState({
        rent: 0,
        commission: 0,
        totalSales: 0,
        status: 'pending'
    });

    // Access notification context
    const { notifications, unreadCount, markAsRead } = useNotifications();

    // Permission check
    const hasPermission = useHasPermission();
    const canEdit = hasPermission('editVendors');

    // Vendor settings state
    const [editingRent, setEditingRent] = useState(false);
    const [editingCommission, setEditingCommission] = useState(false);
    const [rentValue, setRentValue] = useState('0');
    const [commissionValue, setCommissionValue] = useState('0');

    // Update state when vendor data changes
    React.useEffect(() => {
        if (vendor) {
            setRentValue(vendor.rent?.toString() || '0');
            setCommissionValue(vendor.commission?.toString() || '0');
        }
    }, [vendor]);

    // Mutation for updating vendor rent and commission
    const updateVendorMutation = useMutation({
        mutationFn: (data: { rent: number, commission: number }) =>
            updateVendorRentAndCommission(vendorId, data),
        onSuccess: () => {
            getQueryClient().invalidateQueries({ queryKey: ['vendor', vendorId] });
            getQueryClient().invalidateQueries({ queryKey: ['vendors'] });
            toast.success("Rent and commission updated successfully");
            setEditingRent(false);
            setEditingCommission(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update rent and commission");
        }
    });

    // Function to invalidate and refresh data
    const refreshData = () => {
        const queryClient = getQueryClient();
        void queryClient.invalidateQueries({ queryKey: ['vendorBills', vendorId] });
    };

    // Get status badge styling
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, string> = {
            'paid': 'bg-green-100 text-green-800 hover:bg-green-100',
            'pending': 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            'overdue': 'bg-red-100 text-red-800 hover:bg-red-100'
        };

        return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    };

    // Function to get month name from number
    const getMonthName = (month: number) => {
        const date = new Date();
        date.setMonth(month - 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    // Handle notification send
    const handleSendNotification = async () => {
        if (!notificationTitle.trim() || !notificationMessage.trim()) {
            toast.error("Please provide both title and message for the notification");
            return;
        }

        try {
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientId: vendorId,
                    title: notificationTitle,
                    message: notificationMessage,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send notification');
            }

            toast.success("Notification sent successfully");
            setNotificationTitle('');
            setNotificationMessage('');
            setIsNotificationDialogOpen(false);
        } catch (error) {
            console.error("Error sending notification:", error);
            toast.error("Failed to send notification");
        }
    };

    // Handle creating a new bill
    const handleCreateBill = async () => {
        try {
            // Calculate commission based on total sales and commission percentage
            const calculatedCommission = (newBillData.totalSales * newBillData.commissionPercentage) / 100;

            const response = await createBill({
                vendorId,
                month: newBillData.month,
                year: newBillData.year,
                rent: newBillData.rent,
                commission: calculatedCommission,
                commissionPercentage: newBillData.commissionPercentage,
                totalSales: newBillData.totalSales,
                status: 'pending',
                // The rest of the fields are handled on the server
            });

            toast.success("Bill created successfully");

            // Reset form and close dialog
            setNewBillData({
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                rent: vendor?.rent || 0,
                commission: 0,
                commissionPercentage: vendor?.commission || 0,
                totalSales: 0
            });
            setIsCreateBillDialogOpen(false);

            // Refresh data using query invalidation
            refreshData();
        } catch (error) {
            console.error("Error creating bill:", error);
            toast.error("Failed to create bill");
        }
    };

    // Handle updating a bill
    const handleEditBill = async () => {
        if (!selectedBill) return;

        try {
            // Calculate commission based on total sales and commission percentage
            const calculatedCommission = (editBillData.totalSales * selectedBill.commissionPercentage) / 100;

            await updateBill(selectedBill._id, {
                rent: editBillData.rent,
                commission: calculatedCommission,
                totalSales: editBillData.totalSales,
                status: editBillData.status as any,
                // The backend will recalculate the total amount
            });

            toast.success("Bill updated successfully");

            // Reset form and close dialog
            setSelectedBill(null);
            setEditBillData({
                rent: 0,
                commission: 0,
                totalSales: 0,
                status: 'pending'
            });
            setIsEditBillDialogOpen(false);

            // Refresh data using query invalidation
            refreshData();
        } catch (error) {
            console.error("Error updating bill:", error);
            toast.error("Failed to update bill");
        }
    };

    // Open edit bill dialog
    const openEditBillDialog = (bill: any) => {
        setSelectedBill(bill);
        setEditBillData({
            rent: bill.rent,
            commission: bill.commission,
            totalSales: bill.totalSales,
            status: bill.status
        });
        setIsEditBillDialogOpen(true);
    };

    // Handle vendor settings
    const handleSaveRent = () => {
        const rent = parseFloat(rentValue);
        const commission = vendor?.commission || 0;

        if (isNaN(rent) || rent < 0) {
            toast.error("Please enter a valid rent amount");
            return;
        }

        updateVendorMutation.mutate({ rent, commission });
    };

    const handleSaveCommission = () => {
        const commission = parseFloat(commissionValue);
        const rent = vendor?.rent || 0;

        if (isNaN(commission) || commission < 0) {
            toast.error("Please enter a valid commission amount");
            return;
        }

        updateVendorMutation.mutate({ rent, commission });
    };

    const handleCancelRent = () => {
        setRentValue(vendor?.rent?.toString() || '0');
        setEditingRent(false);
    };

    const handleCancelCommission = () => {
        setCommissionValue(vendor?.commission?.toString() || '0');
        setEditingCommission(false);
    };

    return (
        <div className="py-6 px-6 space-y-6">
            {/* Vendor Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-md shadow-sm">
                <div className="flex items-center gap-4">
                    {vendor?.logo ? (
                        <img
                            src={vendor.logo}
                            alt={vendor.name}
                            className="h-16 w-16 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-full bg-[#F7F3F2] flex items-center justify-center text-[#44312D] font-semibold text-xl">
                            {vendor?.name?.substring(0, 2).toUpperCase() || "VN"}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-semibold">{vendor?.name}</h1>
                        <div className="flex items-center gap-2 text-gray-500">
                            <Badge className="bg-[#F7F3F2] text-[#44312D] hover:bg-[#F7F3F2]">
                                {getVendorCategory(vendor?.chosenShopStyle) || 'No category'}
                            </Badge>
                            <span className="text-sm">
                                Active since: {vendor?.activationDate ?
                                    new Date(vendor.activationDate).toLocaleDateString() :
                                    'Not activated'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => setIsCreateBillDialogOpen(true)}
                        className="bg-[#44312D] hover:bg-[#2D1F1B] flex-1 sm:flex-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Issue New Bill
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsNotificationDialogOpen(true)}
                        className="flex-1 sm:flex-auto"
                    >
                        <Bell className="mr-2 h-4 w-4" />
                        Send Notification
                    </Button>
                </div>
            </div>

            {/* Vendor Financial Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Monthly Rent Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Monthly Rent</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-2">
                            {editingRent ? (
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        type="number"
                                        value={rentValue}
                                        onChange={(e) => setRentValue(e.target.value)}
                                        className="w-24 h-8 text-sm"
                                        min="0"
                                        step="0.01"
                                    />
                                    <span className="text-sm text-gray-500">EGP</span>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveRent}
                                        disabled={updateVendorMutation.isPending}
                                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelRent}
                                        disabled={updateVendorMutation.isPending}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-2xl font-bold">
                                        {formatCurrency(vendor?.rent || 0)}
                                    </span>
                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingRent(true)}
                                            className="h-8 w-8 p-0 hover:bg-gray-200 ml-auto"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Commission Rate Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Commission Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center gap-2">
                            {editingCommission ? (
                                <div className="flex items-center gap-2 w-full">
                                    <Input
                                        type="number"
                                        value={commissionValue}
                                        onChange={(e) => setCommissionValue(e.target.value)}
                                        className="w-24 h-8 text-sm"
                                        min="0"
                                        step="0.01"
                                    />
                                    <span className="text-sm text-gray-500">%</span>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveCommission}
                                        disabled={updateVendorMutation.isPending}
                                        className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelCommission}
                                        disabled={updateVendorMutation.isPending}
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-2xl font-bold">
                                        {vendor?.commission || 0}%
                                    </span>
                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEditingCommission(true)}
                                            className="h-8 w-8 p-0 hover:bg-gray-200 ml-auto"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Total Collected Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Collected (This Month)</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2">
                            <span className="text-2xl font-bold">
                                {formatCurrency(
                                    bills?.reduce((sum: number, bill: any) => {
                                        const currentMonth = new Date().getMonth() + 1;
                                        const currentYear = new Date().getFullYear();
                                        return (bill.status === 'paid' &&
                                            bill.month === currentMonth &&
                                            bill.year === currentYear)
                                            ? sum + bill.totalAmount
                                            : sum;
                                    }, 0) || 0
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {!canEdit && (
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        You don't have permission to edit vendor financial settings
                    </p>
                </div>
            )}

            {/* Send Notification Dialog */}
            <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Send Notification to {vendor?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title</Label>
                            <Input
                                id="title"
                                value={notificationTitle}
                                onChange={(e) => setNotificationTitle(e.target.value)}
                                placeholder="Enter notification title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                                id="message"
                                value={notificationMessage}
                                onChange={(e) => setNotificationMessage(e.target.value)}
                                placeholder="Enter notification message"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsNotificationDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendNotification}
                            className="bg-[#44312D] hover:bg-[#2D1F1B]"
                        >
                            Send Notification
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Bill Dialog */}
            <Dialog open={isCreateBillDialogOpen} onOpenChange={setIsCreateBillDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Bill for {vendor?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="month">Month</Label>
                                <select
                                    id="month"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    value={newBillData.month}
                                    onChange={(e) => setNewBillData({ ...newBillData, month: parseInt(e.target.value) })}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>
                                            {getMonthName(month)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <select
                                    id="year"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    value={newBillData.year}
                                    onChange={(e) => setNewBillData({ ...newBillData, year: parseInt(e.target.value) })}
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rent">Rent Amount</Label>
                            <Input
                                id="rent"
                                type="number"
                                value={newBillData.rent}
                                onChange={(e) => setNewBillData({ ...newBillData, rent: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totalSales">Total Sales</Label>
                            <Input
                                id="totalSales"
                                type="number"
                                value={newBillData.totalSales}
                                onChange={(e) => {
                                    const totalSales = parseFloat(e.target.value);
                                    setNewBillData({
                                        ...newBillData,
                                        totalSales,
                                    });
                                }}
                            />
                            <p className="text-sm text-gray-500">
                                Commission: {formatCurrency((newBillData.totalSales * newBillData.commissionPercentage) / 100)}
                                ({newBillData.commissionPercentage}% of total sales)
                            </p>
                        </div>
                        <div className="pt-2">
                            <p className="font-semibold">
                                Total Amount: {formatCurrency(
                                    newBillData.rent + ((newBillData.totalSales * newBillData.commissionPercentage) / 100)
                                )}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateBillDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateBill}
                            className="bg-[#44312D] hover:bg-[#2D1F1B]"
                        >
                            Create Bill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Bill Dialog */}
            <Dialog open={isEditBillDialogOpen} onOpenChange={setIsEditBillDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Bill - {selectedBill && `${getMonthName(selectedBill.month)} ${selectedBill.year}`}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedBill && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="editRent">Rent Amount</Label>
                                <Input
                                    id="editRent"
                                    type="number"
                                    value={editBillData.rent}
                                    onChange={(e) => setEditBillData({ ...editBillData, rent: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="editTotalSales">Total Sales</Label>
                                <Input
                                    id="editTotalSales"
                                    type="number"
                                    value={editBillData.totalSales}
                                    onChange={(e) => {
                                        const totalSales = parseFloat(e.target.value);
                                        setEditBillData({
                                            ...editBillData,
                                            totalSales,
                                        });
                                    }}
                                />
                                <p className="text-sm text-gray-500">
                                    Commission: {formatCurrency((editBillData.totalSales * selectedBill.commissionPercentage) / 100)}
                                    ({selectedBill.commissionPercentage}% of total sales)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="editStatus">Status</Label>
                                <select
                                    id="editStatus"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    value={editBillData.status}
                                    onChange={(e) => setEditBillData({ ...editBillData, status: e.target.value })}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <p className="font-semibold">
                                    Total Amount: {formatCurrency(
                                        editBillData.rent + ((editBillData.totalSales * selectedBill.commissionPercentage) / 100)
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditBillDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditBill}
                            className="bg-[#44312D] hover:bg-[#2D1F1B]"
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bills Table */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Bills History</h2>
                <ScrollArea className="h-[calc(100vh-400px)]">
                    <Table>
                        <TableHeader className="bg-[#F7F3F2]">
                            <TableRow>
                                <TableHead className="font-medium text-[#44312D]">Period</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Bill ID</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Rent</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Commission</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Total Sales</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Total Amount</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Due Date</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Status</TableHead>
                                <TableHead className="font-medium text-[#44312D]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills?.map((bill: any) => (
                                <TableRow key={bill._id} className="border-b border-gray-100">
                                    <TableCell>{getMonthName(bill.month)} {bill.year}</TableCell>
                                    <TableCell>{bill._id}</TableCell>
                                    <TableCell>{formatCurrency(bill.rent)}</TableCell>
                                    <TableCell>{formatCurrency(bill.commission)}</TableCell>
                                    <TableCell>{formatCurrency(bill.totalSales)}</TableCell>
                                    <TableCell>{formatCurrency(bill.totalAmount)}</TableCell>
                                    <TableCell>{formatDate(bill.dueDate)}</TableCell>
                                    <TableCell>
                                        <Badge className={getStatusBadge(bill.status)}>
                                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditBillDialog(bill)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!bills?.length && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                        No bills found for this vendor
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
} 