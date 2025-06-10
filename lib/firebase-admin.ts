import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
    // Check if Firebase Admin is already initialized
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Initialize with service account
    // You'll need to add your service account credentials to environment variables
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    return initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}

// Initialize the app
const app = initializeFirebaseAdmin();

// Export the auth instance
export const adminAuth = getAuth(app);

export default app; 