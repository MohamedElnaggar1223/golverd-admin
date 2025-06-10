'use client';

import { useState, useEffect } from 'react';
import FlutterView from "./FlutterView";
import { generateVendorToken } from "@/lib/actions/firebase-admin-actions";

interface EmbeddedVirtualStoreProps {
    vendorUid?: string; // Optional: if provided, will impersonate this vendor
}

export default function EmbeddedVirtualStore({ vendorUid }: EmbeddedVirtualStoreProps) {
    const [authToken, setAuthToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Base URL of your Flutter web app
    const baseFlutterUrl = 'https://vendor.golverd.com';

    useEffect(() => {
        async function fetchToken() {
            if (!vendorUid) {
                // No vendor UID provided, load Flutter app normally
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await generateVendorToken(vendorUid);
                if (result.success) {
                    setAuthToken(result.token);
                } else {
                    setError('Failed to generate authentication token');
                }
            } catch (err) {
                setError('Failed to generate authentication token');
                console.error('Error generating token:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchToken();
    }, [vendorUid]);

    // Construct the Flutter app URL
    const flutterAppUrl = vendorUid && authToken
        ? `${baseFlutterUrl}?authToken=${encodeURIComponent(authToken)}&vendorUid=${encodeURIComponent(vendorUid)}`
        : baseFlutterUrl;


    if (loading) {
        return (
            <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Generating authentication token...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-red-600">
                        <p className="text-lg font-semibold">Authentication Error</p>
                        <p className="mt-2">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <FlutterView src={flutterAppUrl} />
            {vendorUid && authToken && (
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Viewing as vendor: {vendorUid}
                </div>
            )}
        </div>
    );
}