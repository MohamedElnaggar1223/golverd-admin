import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: Buffer, folder: string = 'team-members'): Promise<string> {
    return new Promise((resolve, reject) => {
        // Convert Buffer to base64 string properly
        const base64String = file.toString('base64');
        const base64Image = `data:image/jpeg;base64,${base64String}`;

        cloudinary.uploader.upload(
            base64Image,
            {
                folder,
                transformation: [
                    { width: 300, height: 300, crop: 'fill' },
                    { quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result?.secure_url || '');
            }
        );
    });
}

export async function deleteImage(publicId: string): Promise<boolean> {
    try {
        // Extract public_id from URL or directly use publicId if it's already the public_id
        let publicIdOnly = publicId;

        if (publicId.includes('cloudinary.com')) {
            // Extract public_id from URL
            const urlParts = publicId.split('/');
            const filenamePart = urlParts[urlParts.length - 1];
            const extensionIndex = filenamePart.lastIndexOf('.');
            const filenameWithoutExtension = extensionIndex !== -1
                ? filenamePart.substring(0, extensionIndex)
                : filenamePart;

            const folderPart = urlParts[urlParts.length - 2];
            publicIdOnly = `${folderPart}/${filenameWithoutExtension}`;
        }

        const result = await cloudinary.uploader.destroy(publicIdOnly);
        return result.result === 'ok';
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        return false;
    }
} 