'use client';

import { use, useEffect, useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getProductById, updateProduct, uploadProductImage, deleteProductImage } from "@/lib/actions/product-actions";
import { getVendorById } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, X, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getQueryClient } from "@/lib/get-query-client";
interface ProductPageProps {
    params: Promise<{
        id: string;
        productId: string;
    }>;
}

const productFormSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    price: z.coerce.number().min(0, "Price must be 0 or higher"),
    description: z.string().optional(),
    category: z.string().optional(),
});

export default function ProductEditPage({ params }: ProductPageProps) {
    const { id, productId } = use(params);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const router = useRouter();
    const queryClient = getQueryClient();

    // Fetch product and vendor data
    const { data: product } = useQuery({
        queryKey: ['product', productId],
        queryFn: () => getProductById(productId)
    });

    const { data: vendor } = useQuery({
        queryKey: ['vendor', id],
        queryFn: () => getVendorById(id)
    });

    const form = useForm<z.infer<typeof productFormSchema>>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            name: product?.name || '',
            price: product?.price || 0,
            description: product?.description || '',
            category: product?.category || '',
        },
    });

    useEffect(() => {
        form.reset({
            name: product?.name || '',
            price: product?.price || 0,
            description: product?.description || '',
            category: product?.category || '',
        });
    }, [product]);

    const updateProductMutation = useMutation({
        mutationFn: (data: z.infer<typeof productFormSchema>) =>
            updateProduct(productId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            toast.success("Product updated successfully");
            setIsSubmitting(false);
        },
        onError: () => {
            toast.error("Failed to update product. Please try again.");
            setIsSubmitting(false);
        }
    });

    // Handle form submission
    const onSubmit = (data: z.infer<typeof productFormSchema>) => {
        setIsSubmitting(true);
        updateProductMutation.mutate(data);
    };

    // Image upload mutation
    const uploadImageMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('productId', productId);

            const response = await fetch(`/api/products/upload-image?productId=${productId}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload image');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            toast.success("Image uploaded successfully");
            setIsUploading(false);
            setSelectedImage(null);
        },
        onError: (error) => {
            console.error("Upload error:", error);
            toast.error("Failed to upload image. Please try again.");
            setIsUploading(false);
        }
    });

    // Image delete mutation
    const deleteImageMutation = useMutation({
        mutationFn: (imageUrl: string) => deleteProductImage(productId, imageUrl),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product', productId] });
            toast.success("Image deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete image. Please try again.");
        }
    });

    // Handle image selection
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedImage(e.target.files[0]);
        }
    };

    // Handle image upload
    const handleImageUpload = async () => {
        if (!selectedImage) return;

        setIsUploading(true);
        uploadImageMutation.mutate(selectedImage);
    };

    // Handle image delete
    const handleImageDelete = (imageUrl: string) => {
        if (window.confirm("Are you sure you want to delete this image?")) {
            deleteImageMutation.mutate(imageUrl);
        }
    };

    // Generate product initials for avatar fallback
    const getProductInitials = (name: string): string => {
        if (!name) return "P";
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    if (!product) {
        return <div>Product not found</div>;
    }

    return (
        <div className="py-6 w-full px-6">
            <Button
                variant="outline"
                size="sm"
                className="mb-4"
                onClick={() => router.push(`/vendors/accounts/${id}`)}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendor
            </Button>

            <div className="flex items-start md:items-center flex-col md:flex-row gap-4 mb-6">
                <Avatar className="h-24 w-24">
                    {product.images && product.images.length > 0 ? (
                        <AvatarImage src={product.images[0]} alt={product.name} />
                    ) : null}
                    <AvatarFallback className='bg-[#E8E4E1]'>
                        {getProductInitials(product.name || '')}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-2xl font-semibold text-[#44312D]">{product.name}</h1>
                    <p className="text-slate-500">
                        {vendor?.name ? `${vendor.name} • ` : ''}
                        {product.category || 'No category'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Product Information</CardTitle>
                        <CardDescription>
                            Edit the details of this product
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Product Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Product name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price (EGP)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Category" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Product description"
                                                    className="resize-none"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-[#2A1C1B] hover:bg-[#44312D] text-white"
                                    >
                                        {isSubmitting ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Product Images</CardTitle>
                            <CardDescription>
                                Manage product images
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleImageUpload}
                                        disabled={!selectedImage || isUploading}
                                        className="bg-[#2A1C1B] hover:bg-[#44312D] text-white"
                                    >
                                        {isUploading ? "Uploading..." : "Upload"}
                                        {!isUploading && <Upload className="ml-2 h-4 w-4" />}
                                    </Button>
                                </div>
                                {selectedImage && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <p className="text-sm text-slate-500 truncate flex-1">{selectedImage.name}</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedImage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {product.images && product.images.length > 0 ? (
                                    product.images.map((image: string, index: number) => (
                                        <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 group">
                                            <img
                                                src={image}
                                                alt={`Product image ${index + 1}`}
                                                className="object-cover w-full h-full"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleImageDelete(image)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-3 aspect-[4/3] rounded-md flex items-center justify-center bg-slate-100 text-slate-500">
                                        No images available
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Product Details</CardTitle>
                            <CardDescription>
                                Additional information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium">Product ID</h3>
                                    <p className="text-sm text-slate-500">{product._id}</p>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-medium">Created</h3>
                                    <p className="text-sm text-slate-500">
                                        {product.createdAt
                                            ? new Date(product.createdAt).toLocaleDateString()
                                            : 'Unknown'
                                        }
                                    </p>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-medium">Last Updated</h3>
                                    <p className="text-sm text-slate-500">
                                        {product.updatedAt
                                            ? new Date(product.updatedAt).toLocaleDateString()
                                            : 'Unknown'
                                        }
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 