'use client';

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { Search, AlertTriangle, CheckCircle, MoreVertical, Star } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/shared/spinner";
import { freezeVendorAccount, deleteVendorAccount } from "@/lib/actions/vendor-actions";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VendorGridProps {
    vendors: any[];
}

export function VendorGrid({ vendors }: VendorGridProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmFreezeDialogOpen, setConfirmFreezeDialogOpen] = useState(false);
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [selectedVendorName, setSelectedVendorName] = useState<string>('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const queryClient = useQueryClient();
    const router = useRouter();

    console.log("vendors", vendors);

    // Mutations for freezing and deleting vendors
    const freezeMutation = useMutation({
        mutationFn: (id: string) => freezeVendorAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            toast("Account updated", {
                description: "The vendor account has been updated.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setConfirmFreezeDialogOpen(false);
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to freeze vendor account",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteVendorAccount(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            toast("Account deleted", {
                description: "The vendor account has been deleted.",
                icon: <CheckCircle className="h-5 w-5 text-green-500" />,
            });
            setConfirmDeleteDialogOpen(false);
        },
        onError: (error: any) => {
            toast("Error", {
                description: error.message || "Failed to delete vendor account",
                icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
            });
        }
    });

    // Filter vendors based on search
    const filteredVendors = vendors.filter((vendor) => {
        return !debouncedSearch ||
            (vendor.name && vendor.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (vendor.email && vendor.email.toLowerCase().includes(debouncedSearch.toLowerCase()));
    });

    // Handle freeze button click
    const handleFreezeClick = (vendor: any) => {
        setSelectedVendorId(vendor._id);
        setSelectedVendorName(vendor.name || 'this vendor');
        setConfirmFreezeDialogOpen(true);
    };

    // Handle delete button click
    const handleDeleteClick = (vendor: any) => {
        setSelectedVendorId(vendor._id);
        setSelectedVendorName(vendor.name || 'this vendor');
        setConfirmDeleteDialogOpen(true);
    };

    // Handle vendor card click
    const handleVendorClick = (vendorId: string) => {
        router.push(`/vendors/accounts/${vendorId}`);
    };

    // Generate rating stars
    const renderRatingStars = (rating: number = 0) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
            } else if (i === fullStars && hasHalfStar) {
                // This is a simplified half star (using a full star with reduced opacity)
                stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 opacity-50" />);
            } else {
                stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
            }
        }

        return stars;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search vendors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredVendors.map((vendor) => (
                    <Card key={vendor._id} className="overflow-hidden rounded-[4px] flex flex-col bg-transparent shadow-none">
                        <div
                            className="h-[182px] w-full cursor-pointer bg-white relative"
                            onClick={() => handleVendorClick(vendor._id)}
                        >
                            {vendor.logo ? (
                                <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
                                    <Avatar className="min-h-[182px] max-h-[182px] min-w-[218px] max-w-[218px] rounded-none">
                                        <AvatarImage
                                            src={vendor.logo}
                                            alt={vendor.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-[#E8E4E1] rounded-none text-2xl">
                                            {vendor.name ? vendor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'VN'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            ) : (
                                <div className="w-full h-full bg-[#E8E4E1] flex items-center justify-center">
                                    <span className="text-2xl font-medium text-gray-700">
                                        {vendor.name ? vendor.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'VN'}
                                    </span>
                                </div>
                            )}

                            {/* <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 rounded-full hover:bg-white/90">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleVendorClick(vendor._id)}>
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-yellow-600"
                                            onClick={() => handleFreezeClick(vendor)}
                                        >
                                            Freeze Account
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => handleDeleteClick(vendor)}
                                        >
                                            Delete Account
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div> */}
                        </div>

                        <CardContent className="px-4 flex items-center justify-between cursor-pointer flex-grow" onClick={() => handleVendorClick(vendor._id)}>
                            <div className="flex items-start justify-start flex-col">
                                <div className="flex items-center space-x-1 mb-1">
                                    {renderRatingStars(vendor.reviews ? (vendor.ratings?.average || 0) : 0)}
                                    <span className="text-sm text-gray-500 ml-1">
                                        ({vendor.reviews || 0})
                                    </span>
                                </div>
                                <h3 className="font-medium line-clamp-1">
                                    {vendor.name || 'Unknown Vendor'}
                                </h3>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/80 rounded-full hover:bg-white/90">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleVendorClick(vendor._id)}>
                                        View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {vendor.status === 'frozen' ? (
                                        <DropdownMenuItem
                                            className="text-yellow-600"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleFreezeClick(vendor);
                                            }}
                                        >
                                            Unfreeze Account
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem
                                            className="text-yellow-600"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleFreezeClick(vendor);
                                            }}
                                        >
                                            Freeze Account
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteClick(vendor);
                                        }}
                                    >
                                        Delete Account
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardContent>
                    </Card>
                ))}

                {filteredVendors.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No vendors found. Try adjusting your search.
                    </div>
                )}
            </div>

            {/* Confirm Freeze Dialog */}
            <Dialog open={confirmFreezeDialogOpen} onOpenChange={setConfirmFreezeDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Freeze Vendor Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {vendors.find((v) => v._id === selectedVendorId)?.status === 'frozen' ? 'unfreeze' : 'freeze'} {selectedVendorName}'s account? {vendors.find((v) => v._id === selectedVendorId)?.status === 'frozen' ? 'This will restore their account to normal operation.' : 'This will temporarily disable their ability to operate.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmFreezeDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={() => selectedVendorId && freezeMutation.mutate(selectedVendorId)}
                            disabled={freezeMutation.isPending}
                        >
                            {freezeMutation.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    {vendors.find((v) => v._id === selectedVendorId)?.status === 'frozen' ? 'Unfreezing...' : 'Freezing...'}
                                </>
                            ) : (
                                vendors.find((v) => v._id === selectedVendorId)?.status === 'frozen' ? 'Unfreeze Account' : 'Freeze Account'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Vendor Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedVendorName}'s account? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedVendorId && deleteMutation.mutate(selectedVendorId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Account'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
} 