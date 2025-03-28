'use client';

import { VendorRequestsTab } from "./components/vendor-requests-tab";

export default function VendorRequestsPage() {
    return (
        <div className="py-6 w-full px-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-[#44312D]">Vendor Requests</h1>
                <p className="text-slate-500">Manage and approve vendor applications</p>
            </div>

            <VendorRequestsTab />
        </div>
    );
} 