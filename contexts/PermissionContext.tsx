'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UserPermissions, createDefaultPermissions } from '@/lib/permissions';

interface PermissionContextType {
    permissions: UserPermissions | null;
    isLoading: boolean;
    isBusinessOwner: boolean;
    refetchPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
    children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
    const { data: session, status } = useSession();
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refetchPermissions = React.useCallback(() => {
        if (session?.user?.permissions) {
            setPermissions(session.user.permissions);
        } else {
            setPermissions(null);
        }
        setIsLoading(status === 'loading');
    }, [session, status]);

    useEffect(() => {
        refetchPermissions();
    }, [refetchPermissions]);

    const isBusinessOwner = session?.user?.isBusinessOwner || false;

    const value: PermissionContextType = {
        permissions,
        isLoading,
        isBusinessOwner,
        refetchPermissions,
    };

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermissions(): PermissionContextType {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionProvider');
    }
    return context;
}

// Additional convenience hooks
export function useHasPermission() {
    const { permissions } = usePermissions();

    return React.useCallback((requiredPermissions: string | string[]) => {
        if (!permissions) return false;

        const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        return perms.some(permission => {
            // Type assertion since we know the structure
            return (permissions as any)[permission] === true;
        });
    }, [permissions]);
}

export function useCanViewRoute() {
    const { permissions } = usePermissions();

    return React.useCallback((route: string) => {
        if (!permissions) return false;

        // Import canViewRoute dynamically to avoid server-side issues
        import('@/lib/permissions').then(({ canViewRoute }) => {
            return canViewRoute(permissions, route);
        });

        // Fallback logic for immediate use
        if (permissions.viewAll) return true;

        // Basic route checking logic
        switch (route) {
            case '/':
                return permissions.viewDashboard || permissions.viewAll;
            case '/team':
                return permissions.viewTeamMembers || permissions.viewAll;
            case '/vendors':
                return permissions.viewVendors || permissions.viewAll;
            case '/finance':
                return permissions.viewFinancialCenter || permissions.viewAll;
            case '/users':
                return permissions.viewUsers || permissions.viewAll;
            case '/orders-and-appointments':
                return permissions.viewOrders || permissions.viewAppointments || permissions.viewAll;
            default:
                return false;
        }
    }, [permissions]);
}

export function useCanEditInRoute() {
    const { permissions } = usePermissions();

    return React.useCallback((route: string) => {
        if (!permissions) return false;

        // Business owners can edit everything
        if (permissions.editAll) return true;

        // Basic route checking logic
        switch (route) {
            case '/team':
                return permissions.editTeamMembers || permissions.editAll;
            case '/vendors':
                return permissions.editVendors || permissions.editAll;
            case '/finance':
                return permissions.editFinancialCenter || permissions.editAll;
            case '/orders-and-appointments':
                return permissions.editOrders || permissions.editAppointments || permissions.editAll;
            default:
                return false;
        }
    }, [permissions]);
} 