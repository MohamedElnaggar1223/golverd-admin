'use client';

import React from 'react';
import { usePermissions, useHasPermission, useCanViewRoute, useCanEditInRoute } from '@/contexts/PermissionContext';
import { UserPermissions } from '@/lib/permissions';

interface PermissionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requireAuth?: boolean;
}

interface RequirePermissionProps extends PermissionGuardProps {
    permissions: string | string[];
}

interface RequireRouteAccessProps extends PermissionGuardProps {
    route: string;
    requireEdit?: boolean;
}

interface RequireBusinessOwnerProps extends PermissionGuardProps { }

interface ConditionalRenderProps {
    condition: boolean;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

// Base conditional render component
function ConditionalRender({ condition, children, fallback = null }: ConditionalRenderProps) {
    return condition ? <>{children}</> : <>{fallback}</>;
}

// Require authentication
export function RequireAuth({ children, fallback = null }: PermissionGuardProps) {
    const { permissions, isLoading } = usePermissions();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    return (
        <ConditionalRender
            condition={permissions !== null}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Require specific permission(s)
export function RequirePermission({ permissions, children, fallback = null }: RequirePermissionProps) {
    const hasPermission = useHasPermission();
    const { isLoading } = usePermissions();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    return (
        <ConditionalRender
            condition={hasPermission(permissions)}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Require route access (view or edit)
export function RequireRouteAccess({ route, requireEdit = false, children, fallback = null }: RequireRouteAccessProps) {
    const canViewRoute = useCanViewRoute();
    const canEditInRoute = useCanEditInRoute();
    const { isLoading } = usePermissions();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    const hasAccess = requireEdit ? canEditInRoute(route) : canViewRoute(route);

    return (
        <ConditionalRender
            condition={hasAccess}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Require business owner access
export function RequireBusinessOwner({ children, fallback = null }: RequireBusinessOwnerProps) {
    const { isBusinessOwner, isLoading } = usePermissions();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    return (
        <ConditionalRender
            condition={isBusinessOwner}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Show content only if user DOESN'T have permission (inverse guard)
export function HideFromPermission({ permissions, children, fallback = null }: RequirePermissionProps) {
    const hasPermission = useHasPermission();
    const { isLoading } = usePermissions();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    return (
        <ConditionalRender
            condition={!hasPermission(permissions)}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Multi-purpose permission guard with flexible options
interface FlexiblePermissionGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;

    // Permission requirements (any one match)
    anyPermissions?: string[];
    // Permission requirements (all must match)
    allPermissions?: string[];
    // Route access requirements
    viewRoute?: string;
    editRoute?: string;
    // User type requirements
    requireBusinessOwner?: boolean;
    requireAuth?: boolean;

    // Inverse conditions
    not?: boolean;
}

export function PermissionGuard({
    children,
    fallback = null,
    anyPermissions,
    allPermissions,
    viewRoute,
    editRoute,
    requireBusinessOwner,
    requireAuth,
    not = false
}: FlexiblePermissionGuardProps) {
    const { permissions, isBusinessOwner, isLoading } = usePermissions();
    const hasPermission = useHasPermission();
    const canViewRoute = useCanViewRoute();
    const canEditInRoute = useCanEditInRoute();

    if (isLoading) {
        return <div className="animate-pulse">Loading...</div>;
    }

    let hasAccess = true;

    // Check authentication
    if (requireAuth && !permissions) {
        hasAccess = false;
    }

    // Check business owner requirement
    if (requireBusinessOwner && !isBusinessOwner) {
        hasAccess = false;
    }

    // Check any permissions (OR logic)
    if (anyPermissions && anyPermissions.length > 0) {
        if (!hasPermission(anyPermissions)) {
            hasAccess = false;
        }
    }

    // Check all permissions (AND logic)
    if (allPermissions && allPermissions.length > 0) {
        if (!allPermissions.every(permission => hasPermission(permission))) {
            hasAccess = false;
        }
    }

    // Check route view access
    if (viewRoute && !canViewRoute(viewRoute)) {
        hasAccess = false;
    }

    // Check route edit access
    if (editRoute && !canEditInRoute(editRoute)) {
        hasAccess = false;
    }

    // Apply inverse logic if requested
    if (not) {
        hasAccess = !hasAccess;
    }

    return (
        <ConditionalRender
            condition={hasAccess}
            fallback={fallback}
        >
            {children}
        </ConditionalRender>
    );
}

// Export the main guard as default
export default PermissionGuard; 