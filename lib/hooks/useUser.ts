'use client';

import { useSession } from "next-auth/react";

export function useUser() {
    const { data: session, status } = useSession();
    const isLoading = status === "loading";
    const isAuthenticated = status === "authenticated";

    return {
        user: session?.user,
        isLoading,
        isAuthenticated
    };
} 