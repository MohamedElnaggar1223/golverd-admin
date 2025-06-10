import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { UserPermissions, canViewRoute, ROUTE_PERMISSIONS } from "@/lib/permissions";

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Define public paths that don't require authentication
    const isPublicPath = path === "/signin";

    // Get token to verify if user is authenticated and get permissions
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Redirect logic for public paths
    if (isPublicPath && token) {
        // If user is authenticated and trying to access public path, redirect to dashboard
        return NextResponse.redirect(new URL("/", req.url));
    }

    if (!isPublicPath && !token) {
        // If user is not authenticated and trying to access protected path, redirect to signin
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    // For authenticated users, check route permissions
    if (token && !isPublicPath) {
        const userPermissions = token.permissions as UserPermissions;

        // Find the most specific route match
        const routeToCheck = findMatchingRoute(path);

        if (routeToCheck && !canViewRoute(userPermissions, routeToCheck)) {
            // User doesn't have permission to view this route
            console.log(`Access denied to ${path} for user ${token.email}. Required permissions not met.`);

            // Check if user can at least view dashboard, otherwise redirect to signin
            if (canViewRoute(userPermissions, '/')) {
                return NextResponse.redirect(new URL("/access-denied", req.url));
            } else {
                // User can't even view dashboard, sign them out
                return NextResponse.redirect(new URL("/signin?error=no-permissions", req.url));
            }
        }
    }

    return NextResponse.next();
}

/**
 * Find the most specific route match for permission checking
 */
function findMatchingRoute(path: string): string | null {
    // First try exact match
    if (ROUTE_PERMISSIONS[path]) {
        return path;
    }

    // Try to find parent route matches, prioritizing longer/more specific routes
    const routes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

    for (const route of routes) {
        if (route !== '/' && path.startsWith(route)) {
            return route;
        }
    }

    // Default to root route if no specific match found
    return '/';
}

// Add the paths you want to protect here
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
    ],
}; 