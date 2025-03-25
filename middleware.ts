import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Define public paths that don't require authentication
    const isPublicPath = path === "/signin";

    // Get token to verify if user is authenticated
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Redirect logic
    if (isPublicPath && token) {
        // If user is authenticated and trying to access public path, redirect to dashboard
        return NextResponse.redirect(new URL("/", req.url));
    }

    if (!isPublicPath && !token) {
        // If user is not authenticated and trying to access protected path, redirect to signin
        return NextResponse.redirect(new URL("/signin", req.url));
    }

    return NextResponse.next();
}

// Add the paths you want to protect here
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
    ],
}; 