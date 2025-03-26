'use client';

import { useState } from 'react';
import UserTable from './components/user-table';
import UserNotifications from './components/user-notifications';
import UserOrders from './components/user-orders';
import UserAppointments from './components/user-appointments';

export default function UsersPage() {
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

    return (
        <div className="space-y-6 py-6 w-full px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-[#2A1C1B]">Users Management</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <UserTable
                        onUserSelect={(id: string, name: string) => setSelectedUser({ id, name })}
                    />
                </div>

                <div className="md:col-span-2 space-y-6">
                    <UserNotifications
                        selectedUserId={selectedUser?.id || null}
                        selectedUserName={selectedUser?.name || null}
                    />

                    <UserOrders
                        selectedUserId={selectedUser?.id || null}
                    />

                    <UserAppointments
                        selectedUserId={selectedUser?.id || null}
                    />
                </div>
            </div>
        </div>
    );
} 