import { getSession, getCurrentUser } from '@/lib/auth';
import { UserPermissions, hasPermission, canViewRoute, canEditInRoute, PermissionKey } from '@/lib/permissions';

/**
 * Auth Guards for Server Actions
 * 
 * Note: Server actions that are used in prefetching during build/prerender
 * should handle AuthenticationError gracefully by returning empty data
 * instead of throwing, since there's no user session during build time.
 */

export interface AuthenticatedUser {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: UserPermissions;
    positionId?: string;
    isBusinessOwner: boolean;
    isActive: boolean;
    accountsManaged?: string[];
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
    constructor(message: string = 'Not authenticated') {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
    constructor(message: string = 'Not authorized') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

/**
 * Get authenticated user with full details including permissions
 * Throws AuthenticationError if user is not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const session = await getSession();

    if (!session?.user) {
        throw new AuthenticationError('User must be authenticated');
    }

    // Get full user details with permissions
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        throw new AuthenticationError('Unable to retrieve user details');
    }

    return currentUser as AuthenticatedUser;
}



/**
 * Require specific permission(s)
 * Throws AuthenticationError if not authenticated
 * Throws AuthorizationError if missing required permissions
 */
export async function requirePermission(
    requiredPermissions: PermissionKey | PermissionKey[]
): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!hasPermission(user.permissions, requiredPermissions)) {
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions;
        throw new AuthorizationError(`Missing required permission(s): ${permissions}`);
    }

    return user;
}

/**
 * Require view access to a specific route
 * Throws AuthenticationError if not authenticated
 * Throws AuthorizationError if cannot view route
 */
export async function requireViewAccess(route: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!canViewRoute(user.permissions, route)) {
        throw new AuthorizationError(`Cannot view route: ${route}`);
    }

    return user;
}

/**
 * Require edit access to a specific route
 * Throws AuthenticationError if not authenticated
 * Throws AuthorizationError if cannot edit in route
 */
export async function requireEditAccess(route: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!canEditInRoute(user.permissions, route)) {
        throw new AuthorizationError(`Cannot edit in route: ${route}`);
    }

    return user;
}

/**
 * Require business owner access
 * Throws AuthenticationError if not authenticated
 * Throws AuthorizationError if not business owner
 */
export async function requireBusinessOwner(): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!user.isBusinessOwner) {
        throw new AuthorizationError('Business owner access required');
    }

    return user;
}

/**
 * Check if current user can access a specific user's data
 * Business owners can access all data
 * Regular users can only access their own data
 */
export async function canAccessUserData(targetUserId: string): Promise<boolean> {
    try {
        const user = await requireAuth();

        // Business owners can access all user data
        if (user.isBusinessOwner) {
            return true;
        }

        // Users can only access their own data
        return user.id === targetUserId;
    } catch {
        return false;
    }
}

/**
 * Check if current user can manage a specific team member
 * Business owners can manage all team members
 * Team members with edit permissions can manage non-business-owner team members
 */
export async function canManageTeamMember(targetUserId: string): Promise<boolean> {
    try {
        const user = await requireAuth();

        // Business owners can manage all team members
        if (user.isBusinessOwner) {
            return true;
        }

        // Check if user has edit team members permission
        if (!hasPermission(user.permissions, ['editTeamMembers', 'editAll'])) {
            return false;
        }

        // TODO: Add logic to check if target user is business owner
        // For now, assume non-business owners can manage other non-business owners
        return true;
    } catch {
        return false;
    }
}

/**
 * Wrapper for server actions to handle authentication and authorization errors
 */
export function withAuth<T extends any[], R>(
    action: (...args: T) => Promise<R>
) {
    return async (...args: T): Promise<R> => {
        try {
            return await action(...args);
        } catch (error) {
            if (error instanceof AuthenticationError) {
                console.error('Authentication error:', error.message);
                throw new Error('Authentication required');
            }

            if (error instanceof AuthorizationError) {
                console.error('Authorization error:', error.message);
                throw new Error('Insufficient permissions');
            }

            // Re-throw other errors as-is
            throw error;
        }
    };
}

/**
 * Helper to format permission errors for client consumption
 */
export function formatPermissionError(error: unknown): { error: string; requiresAuth?: boolean } {
    if (error instanceof AuthenticationError) {
        return { error: 'Authentication required', requiresAuth: true };
    }

    if (error instanceof AuthorizationError) {
        return { error: 'Insufficient permissions' };
    }

    if (error instanceof Error) {
        return { error: error.message };
    }

    return { error: 'An unexpected error occurred' };
} 