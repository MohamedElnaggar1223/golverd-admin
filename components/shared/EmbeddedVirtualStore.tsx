'use client';

import { useState, useEffect } from 'react';
import FlutterView from "./FlutterView";
import { createAuthShop } from "@/lib/actions/firebase-admin-actions";

interface EmbeddedVirtualStoreProps {
    vendorUid?: string; // Optional: if provided, will impersonate this vendor
}

export default function EmbeddedVirtualStore({ vendorUid }: EmbeddedVirtualStoreProps) {
    const [flutterAppUrl, setFlutterAppUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Base URL of your Flutter web app (fallback if no vendorUid)
    const baseFlutterUrl = 'https://vendor.golverd.com';

    useEffect(() => {
        async function fetchAuthShopUrl() {
            if (!vendorUid) {
                // No vendor UID provided, load Flutter app normally
                setFlutterAppUrl(baseFlutterUrl);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Call the server action directly
                const result = await createAuthShop(vendorUid);

                console.log(result);

                if (result.success && result.url) {
                    setFlutterAppUrl(result.url);
                } else {
                    setError('Failed to generate authentication URL');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate authentication URL');
                console.error('Error generating auth shop URL:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAuthShopUrl();
    }, [vendorUid]);

    if (loading) {
        return (
            <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Generating authentication URL...</p>
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

    if (!flutterAppUrl) {
        return (
            <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-600">
                        <p>Loading virtual store...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '80vh', marginTop: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <FlutterView src={flutterAppUrl} />
            {vendorUid && (
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                    Viewing as vendor: {vendorUid}
                </div>
            )}
        </div>
    );
}