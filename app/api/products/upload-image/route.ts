import { NextRequest, NextResponse } from 'next/server';
import { uploadProductImage } from '@/lib/actions/product-actions';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Get the product ID from the URL
        const productId = request.nextUrl.searchParams.get('productId');
        if (!productId) {
            return NextResponse.json(
                { error: 'Product ID is required' },
                { status: 400 }
            );
        }

        // Get the file from the request
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Convert file to buffer for cloudinary
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload the image
        const result = await uploadProductImage(productId, buffer);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in upload API route:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload image' },
            { status: 500 }
        );
    }
} 