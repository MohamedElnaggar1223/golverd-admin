'use server';

import { adminAuth } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import Admin from '@/models/Admin';

/**
 * Generate a custom Firebase token for vendor impersonation
 * Only admins can use this function
 */
export async function generateVendorToken(vendorUid: string) {
    try {
        // Verify admin authentication
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // TODO: Add admin role verification here if you have role-based access
        // For now, assuming all authenticated users in admin dashboard are admins

        if (!vendorUid) {
            throw new Error('Vendor UID is required');
        }

        // Generate custom token with additional claims
        const customToken = await adminAuth.createCustomToken(vendorUid, {
            adminImpersonation: true,
            impersonatedBy: session.user.id || session.user.email,
            impersonationTimestamp: Date.now()
        });

        return { success: true, token: customToken };
    } catch (error) {
        console.error('Error generating vendor token:', error);
        throw new Error('Failed to generate vendor token');
    }
}

/**
 * Verify if current user is admin (placeholder - implement based on your auth system)
 */
export async function verifyAdminPermissions() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return false;
        }

        // TODO: Implement your admin verification logic here
        // This could check user roles, permissions, etc.
        return true; // For now, assume all users in admin dashboard are admins
    } catch (error) {
        console.error('Error verifying admin permissions:', error);
        return false;
    }
}

/**
 * Create authentication shop URL for vendor impersonation
 * Replicates the backend createAuthShop function as a server action
 */
export async function createAuthShop(vendorID: string) {
    try {
        // Verify admin authentication
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        if (!vendorID) {
            throw new Error('vendorID is required');
        }

        // Connect to database
        await connectDB();

        // Find the admin user by brandDocID
        const user = await Admin.findOne({
            brandDocID: vendorID
        });

        if (!user) {
            throw new Error('Vendor not found');
        }

        const email = user.email;
        let userRecord;
        let uidToUse; // This will be the UID we use for createCustomToken

        try {
            // Option 1: Try to get user by email first
            userRecord = await adminAuth.getUserByEmail(email);
            console.log('Found existing Firebase user:', userRecord.uid);
            uidToUse = userRecord.uid; // User exists, use their existing UID
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                // Option 2: If user not found by email, create a new user.
                // Create a "safe" UID from the email if we are creating a new user.
                const sanitizedEmailUid = email.replace(/[^a-zA-Z0-9]/g, '');
                uidToUse = sanitizedEmailUid.substring(0, 128); // UIDs max 128 chars

                userRecord = await adminAuth.createUser({
                    uid: uidToUse, // You can specify a UID here if desired, or let Firebase generate one
                    email: email,
                    emailVerified: false,
                    disabled: false,
                });
                console.log(`Created new Firebase user with UID: ${uidToUse} and email: ${email}`);
            } else {
                throw error; // Re-throw other errors
            }
        }

        // IMPORTANT: Ensure the email property on the Firebase Auth user record is set.
        // This is what populates user.email in the client SDK.
        // This step is critical if the user was created without an email or if
        // their email was updated in your external system.
        if (userRecord.email !== email) {
            await adminAuth.updateUser(userRecord.uid, { email: email });
            console.log(`Updated Firebase user ${userRecord.uid} email to: ${email}`);
        }

        // Generate a custom token.
        // The custom claims (like `{ email: email }`) are for the JWT payload,
        // which your secure APIs can read. They don't directly populate user.email.
        const customToken = await adminAuth.createCustomToken(userRecord.uid, {
            email: email, // This is a custom claim within the ID token
            adminImpersonation: true,
            impersonatedBy: session.user.id || session.user.email,
            impersonationTimestamp: Date.now()
        });

        const url = `https://shop.admin.golverd.com/${customToken}`;

        return { success: true, url };

    } catch (error) {
        console.error('Error generating custom token:', error);
        throw new Error(`Failed to generate authentication token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}