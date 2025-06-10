// Permission constants and types
export const PERMISSION_KEYS = {
    // View permissions
    VIEW_ALL: 'viewAll',
    VIEW_DASHBOARD: 'viewDashboard',
    VIEW_TEAM_MEMBERS: 'viewTeamMembers',
    VIEW_VENDORS: 'viewVendors',
    VIEW_ORDERS: 'viewOrders',
    VIEW_APPOINTMENTS: 'viewAppointments',
    VIEW_FINANCIAL_CENTER: 'viewFinancialCenter',
    VIEW_USERS: 'viewUsers',

    // Edit permissions
    EDIT_ALL: 'editAll',
    EDIT_TEAM_MEMBERS: 'editTeamMembers',
    EDIT_VENDORS: 'editVendors',
    EDIT_ORDERS: 'editOrders',
    EDIT_APPOINTMENTS: 'editAppointments',
    EDIT_FINANCIAL_CENTER: 'editFinancialCenter',
} as const;

export type PermissionKey = typeof PERMISSION_KEYS[keyof typeof PERMISSION_KEYS];

export interface UserPermissions {
    viewAll: boolean;
    viewDashboard: boolean;
    viewTeamMembers: boolean;
    viewVendors: boolean;
    viewOrders: boolean;
    viewAppointments: boolean;
    viewFinancialCenter: boolean;
    viewUsers: boolean;
    editAll: boolean;
    editTeamMembers: boolean;
    editVendors: boolean;
    editOrders: boolean;
    editAppointments: boolean;
    editFinancialCenter: boolean;
}

// Route to permission mapping
export const ROUTE_PERMISSIONS: Record<string, { view: PermissionKey[], edit?: PermissionKey[] }> = {
    '/': {
        view: [PERMISSION_KEYS.VIEW_DASHBOARD, PERMISSION_KEYS.VIEW_ALL]
    },
    '/team': {
        view: [PERMISSION_KEYS.VIEW_TEAM_MEMBERS, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_TEAM_MEMBERS, PERMISSION_KEYS.EDIT_ALL]
    },
    '/vendors': {
        view: [PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]
    },
    '/vendors/requests': {
        view: [PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]
    },
    '/vendors/accounts': {
        view: [PERMISSION_KEYS.VIEW_VENDORS, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_VENDORS, PERMISSION_KEYS.EDIT_ALL]
    },
    '/finance': {
        view: [PERMISSION_KEYS.VIEW_FINANCIAL_CENTER, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_FINANCIAL_CENTER, PERMISSION_KEYS.EDIT_ALL]
    },
    '/users': {
        view: [PERMISSION_KEYS.VIEW_USERS, PERMISSION_KEYS.VIEW_ALL]
    },
    '/orders-and-appointments': {
        view: [PERMISSION_KEYS.VIEW_ORDERS, PERMISSION_KEYS.VIEW_APPOINTMENTS, PERMISSION_KEYS.VIEW_ALL],
        edit: [PERMISSION_KEYS.EDIT_ORDERS, PERMISSION_KEYS.EDIT_APPOINTMENTS, PERMISSION_KEYS.EDIT_ALL]
    }
};

/**
 * Check if user has any of the required permissions
 */
export function hasPermission(
    userPermissions: UserPermissions | null | undefined,
    requiredPermissions: PermissionKey | PermissionKey[]
): boolean {
    if (!userPermissions) return false;

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return permissions.some(permission => userPermissions[permission] === true);
}

/**
 * Check if user can view a specific route
 */
export function canViewRoute(
    userPermissions: UserPermissions | null | undefined,
    route: string
): boolean {
    if (!userPermissions) return false;

    // Business owners can access everything
    if (userPermissions.viewAll) return true;

    const routeConfig = ROUTE_PERMISSIONS[route];
    if (!routeConfig) return false;

    return hasPermission(userPermissions, routeConfig.view);
}

/**
 * Check if user can edit in a specific route
 */
export function canEditInRoute(
    userPermissions: UserPermissions | null | undefined,
    route: string
): boolean {
    if (!userPermissions) return false;

    // Business owners can edit everything
    if (userPermissions.editAll) return true;

    const routeConfig = ROUTE_PERMISSIONS[route];
    if (!routeConfig?.edit) return false;

    return hasPermission(userPermissions, routeConfig.edit);
}

/**
 * Check if user is business owner (has all permissions)
 */
export function isBusinessOwner(
    userPermissions: UserPermissions | null | undefined
): boolean {
    if (!userPermissions) return false;
    return userPermissions.viewAll && userPermissions.editAll;
}

/**
 * Get all accessible routes for a user
 */
export function getAccessibleRoutes(userPermissions: UserPermissions | null | undefined): string[] {
    if (!userPermissions) return [];

    return Object.keys(ROUTE_PERMISSIONS).filter(route =>
        canViewRoute(userPermissions, route)
    );
}

/**
 * Get all editable routes for a user
 */
export function getEditableRoutes(userPermissions: UserPermissions | null | undefined): string[] {
    if (!userPermissions) return [];

    return Object.keys(ROUTE_PERMISSIONS).filter(route =>
        canEditInRoute(userPermissions, route)
    );
}

/**
 * Create default permissions (no access)
 */
export function createDefaultPermissions(): UserPermissions {
    return {
        viewAll: false,
        viewDashboard: true, // Everyone should be able to see dashboard
        viewTeamMembers: false,
        viewVendors: false,
        viewOrders: false,
        viewAppointments: false,
        viewFinancialCenter: false,
        viewUsers: false,
        editAll: false,
        editTeamMembers: false,
        editVendors: false,
        editOrders: false,
        editAppointments: false,
        editFinancialCenter: false,
    };
}

/**
 * Create business owner permissions (full access)
 */
export function createBusinessOwnerPermissions(): UserPermissions {
    return {
        viewAll: true,
        viewDashboard: true,
        viewTeamMembers: true,
        viewVendors: true,
        viewOrders: true,
        viewAppointments: true,
        viewFinancialCenter: true,
        viewUsers: true,
        editAll: true,
        editTeamMembers: true,
        editVendors: true,
        editOrders: true,
        editAppointments: true,
        editFinancialCenter: true,
    };
} 