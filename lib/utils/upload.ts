'use server';

import { uploadImage } from '@/lib/cloudinary';

export async function uploadToCloudinary(file: any): Promise<string> {
    try {
        // If it's already a string, just return it
        if (typeof file === 'string') {
            return file;
        }

        // Convert file to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Cloudinary using the existing function
        const imageUrl = await uploadImage(buffer, 'team-members');

        return imageUrl;
    } catch (error) {
        console.error('Error uploading file to Cloudinary', error);
        throw new Error('Failed to upload image');
    }
} 